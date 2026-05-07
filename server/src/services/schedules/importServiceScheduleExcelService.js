import ExcelJS from 'exceljs';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

const DAY_START_COL = 5;
const DAY_END_COL = 35;
const FIRST_EMPLOYEE_ROW = 12;
const EMPLOYEE_BLOCK_SIZE = 4;

const normalizeName = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const isPlaceholderName = (value) => {
    const normalized = normalizeName(value);
    if (!normalized) return true;

    return [
        'plantilla',
        'nombre trabajador',
        'dos apellidos y nombre',
    ].some(
        (placeholder) =>
            normalized === placeholder || normalized.includes(placeholder)
    );
};

const nameTokens = (value) =>
    normalizeName(value)
        .split(' ')
        .filter((token) => token.length > 1);

const levenshtein = (left, right) => {
    const a = normalizeName(left);
    const b = normalizeName(right);
    if (!a) return b.length;
    if (!b) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, (_, index) => [
        index,
    ]);
    for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
};

const scoreEmployeeMatch = (employee, excelName) => {
    const excelNormalized = normalizeName(excelName);
    const employeeNormalized = employee.normalizedName;
    const excelTokens = nameTokens(excelName);
    const employeeTokens = nameTokens(employee.fullName);
    const tokenMatches = excelTokens.filter((token) =>
        employeeTokens.includes(token)
    ).length;
    const distance = levenshtein(employeeNormalized, excelNormalized);
    const maxLength = Math.max(employeeNormalized.length, excelNormalized.length, 1);
    const distanceScore = 1 - distance / maxLength;
    const tokenScore =
        excelTokens.length > 0 ? tokenMatches / excelTokens.length : 0;
    const containsScore =
        employeeNormalized.includes(excelNormalized) ||
        excelNormalized.includes(employeeNormalized)
            ? 1
            : 0;

    return Math.max(distanceScore, tokenScore, containsScore);
};

const suggestEmployees = (employees, excelName) =>
    employees
        .map((employee) => ({
            id: employee.id,
            name: employee.fullName || employee.email || 'Empleado',
            email: employee.email,
            score: scoreEmployeeMatch(employee, excelName),
        }))
        .filter((employee) => employee.score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

const pad = (value) => String(value).padStart(2, '0');

const getCellPlainValue = (cell) => {
    const value = cell?.value;
    if (value && typeof value === 'object' && 'result' in value) {
        return value.result;
    }
    return value;
};

const getExcelTime = (cell) => {
    const value = getCellPlainValue(cell);
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:00`;
    }

    if (typeof value === 'number' && value > 0) {
        const totalMinutes = Math.round((value % 1) * 24 * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        return `${pad(hours)}:${pad(minutes)}:00`;
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{1,2})[:.](\d{2})$/);
    if (match) return `${pad(match[1])}:${match[2]}:00`;

    return null;
};

const buildDateString = (month, day) => {
    const [year, monthValue] = month.split('-').map(Number);
    return `${year}-${pad(monthValue)}-${pad(day)}`;
};

const loadEmployees = async (pool) => {
    const [rows] = await pool.query(
        `
        SELECT id, firstName, lastName, email
        FROM users
        WHERE LOWER(role) IN ('employee', 'empleado')
          AND deletedAt IS NULL
        `
    );

    return rows.map((employee) => {
        const fullName = `${employee.firstName || ''} ${
            employee.lastName || ''
        }`.trim();
        return {
            ...employee,
            fullName,
            normalizedName: normalizeName(fullName),
        };
    });
};

const findEmployee = (employees, excelName) => {
    const normalized = normalizeName(excelName);
    if (!normalized) return null;
    const excelTokens = nameTokens(excelName);

    return (
        employees.find((employee) => employee.normalizedName === normalized) ||
        employees.find(
            (employee) =>
                employee.normalizedName.includes(normalized) ||
                normalized.includes(employee.normalizedName)
        ) ||
        employees.find((employee) => {
            const employeeTokens = nameTokens(employee.fullName);
            if (!employeeTokens.length || !excelTokens.length) return false;
            const matches = excelTokens.filter((token) =>
                employeeTokens.includes(token)
            );
            return matches.length >= Math.min(2, excelTokens.length);
        }) ||
        null
    );
};

const parseWorkbook = async ({ filePath, month, employees, employeeMappings = {} }) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet('VIGILANTES') || workbook.worksheets[0];

    if (!worksheet) generateErrorUtil('El Excel no contiene hojas', 400);

    const serviceName =
        worksheet.getCell('K2').value ||
        worksheet.getCell('H5').value ||
        worksheet.name;

    const shifts = [];
    const employeeRows = [];
    const unknownEmployees = new Set();
    const unmatchedMap = new Map();

    for (
        let rowNumber = FIRST_EMPLOYEE_ROW;
        rowNumber <= worksheet.rowCount;
        rowNumber += EMPLOYEE_BLOCK_SIZE
    ) {
        const rawName = String(worksheet.getCell(rowNumber, 1).value || '').trim();
        if (!rawName || rawName.toLowerCase().includes('dos apellidos')) continue;
        if (rawName.toLowerCase() === 'n.º') continue;

        if (isPlaceholderName(rawName)) continue;

        const mappedEmployeeId =
            employeeMappings[rawName] || employeeMappings[normalizeName(rawName)];
        const mappedEmployee = mappedEmployeeId
            ? employees.find((employee) => employee.id === mappedEmployeeId)
            : null;
        const employee = mappedEmployee || findEmployee(employees, rawName);
        employeeRows.push({
            row: rowNumber,
            excelName: rawName,
            employeeId: employee?.id || null,
            employeeName: employee?.fullName || null,
        });

        for (let col = DAY_START_COL; col <= DAY_END_COL; col += 1) {
            const day = Number(worksheet.getCell(10, col).value);
            if (!day) continue;

            const startTime = getExcelTime(worksheet.getCell(rowNumber, col));
            const endTime = getExcelTime(worksheet.getCell(rowNumber + 1, col));
            if (!startTime || !endTime) continue;

            const scheduleDate = buildDateString(month, day);

            if (!employee) {
                unknownEmployees.add(rawName);
                const current = unmatchedMap.get(rawName) || {
                    excelName: rawName,
                    shiftCount: 0,
                    suggestions: suggestEmployees(employees, rawName),
                };
                current.shiftCount += 1;
                unmatchedMap.set(rawName, current);
                continue;
            }

            shifts.push({
                employeeId: employee.id,
                employeeName: employee.fullName,
                excelName: rawName,
                scheduleDate,
                startTime,
                endTime,
                hours: calculateShiftHours(startTime, endTime),
            });
        }
    }

    return {
        worksheetName: worksheet.name,
        serviceName: String(serviceName || '').trim(),
        month,
        employeeRows,
        unknownEmployees: [...unknownEmployees],
        unmatchedEmployees: [...unmatchedMap.values()],
        shifts,
        shiftCount: shifts.length,
    };
};

const importServiceScheduleExcelService = async ({
    serviceId,
    filePath,
    month,
    apply = false,
    replace = true,
    employeeMappings = {},
    createdBy,
}) => {
    if (!filePath) generateErrorUtil('Archivo Excel requerido', 400);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        generateErrorUtil('Mes invalido', 400);
    }

    const pool = await getPool();
    const employees = await loadEmployees(pool);
    const preview = await parseWorkbook({
        filePath,
        month,
        employees,
        employeeMappings,
    });

    if (!apply) {
        return {
            ...preview,
            applied: false,
        };
    }

    if (preview.unmatchedEmployees.length) {
        generateErrorUtil(
            `Hay trabajadores sin emparejar: ${preview.unknownEmployees.join(', ')}`,
            409
        );
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (replace) {
            await conn.query(
                `
                UPDATE serviceScheduleShifts
                SET deletedAt = NOW()
                WHERE serviceId = ?
                  AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?
                  AND status = 'scheduled'
                  AND deletedAt IS NULL
                `,
                [serviceId, month]
            );
        }

        for (const shift of preview.shifts) {
            await conn.query(
                `
                INSERT INTO serviceScheduleShifts
                    (id, serviceId, employeeId, scheduleDate, startTime, endTime, hours, status, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
                `,
                [
                    uuid(),
                    serviceId,
                    shift.employeeId,
                    shift.scheduleDate,
                    shift.startTime,
                    shift.endTime,
                    shift.hours,
                    createdBy,
                ]
            );
        }

        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }

    return {
        ...preview,
        applied: true,
        replaced: replace,
    };
};

export default importServiceScheduleExcelService;
