import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';
import { calculateShiftHourBreakdowns } from './calculateShiftHourBreakdownsService.js';
import validateEmployeeShiftOverlapsService from './validateEmployeeShiftOverlapsService.js';
import { saveServiceScheduleSnapshot } from './serviceScheduleSnapshotService.js';

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
        excelNormalized.length >= 6 &&
        (employeeNormalized.includes(excelNormalized) ||
            excelNormalized.includes(employeeNormalized))
            ? 0.75
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

const normalizeDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
            value.getDate()
        )}`;
    }
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const normalizeTimeKey = (value) => {
    const [hours, minutes, seconds = '00'] = String(value || '').split(':');
    if (!hours || !minutes) return '';
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const normalizeImportTime = (value) => {
    const match = String(value || '')
        .trim()
        .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return '';

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59
    ) {
        return '';
    }

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

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

const getDaysInMonth = (month) => {
    const [year, monthValue] = month.split('-').map(Number);
    return new Date(year, monthValue, 0).getDate();
};

const getCellText = (worksheet, rowNumber, colNumber) =>
    String(worksheet.getCell(rowNumber, colNumber).value || '').trim();

const findDayColumns = (worksheet) => {
    let best = { rowNumber: 10, columns: [] };

    for (let rowNumber = 8; rowNumber <= 14; rowNumber += 1) {
        const columns = [];
        worksheet.getRow(rowNumber).eachCell((cell, colNumber) => {
            const day = Number(getCellPlainValue(cell));
            if (day >= 1 && day <= 31) {
                columns.push({ col: colNumber, day });
            }
        });

        if (columns.length > best.columns.length) {
            best = { rowNumber, columns };
        }
    }

    if (best.columns.length) return best;

    return {
        rowNumber: 10,
        columns: Array.from(
            { length: DAY_END_COL - DAY_START_COL + 1 },
            (_, index) => ({
                col: DAY_START_COL + index,
                day: index + 1,
            })
        ),
    };
};

const getEmployeeNameFromRow = (worksheet, rowNumber) => {
    const parts = [];
    for (let col = 1; col <= 4; col += 1) {
        const text = getCellText(worksheet, rowNumber, col);
        if (text) parts.push(text);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const rowHasShiftTimes = (worksheet, rowNumber, dayColumns) =>
    dayColumns.some(({ col }) => {
        const startTime = getExcelTime(worksheet.getCell(rowNumber, col));
        const endTime = getExcelTime(worksheet.getCell(rowNumber + 1, col));
        return Boolean(startTime && endTime);
    });

const buildShiftKey = (shift) =>
    [
        shift.employeeId || '',
        normalizeDateKey(shift.scheduleDate),
        normalizeTimeKey(shift.startTime),
        normalizeTimeKey(shift.endTime),
    ].join('|');

const buildAbsenceKey = (absence) =>
    [
        absence.employeeId || '',
        normalizeDateKey(absence.startDate),
        normalizeDateKey(absence.endDate),
        absence.type || '',
    ].join('|');

const dedupeShifts = (shifts) => {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    shifts.forEach((shift) => {
        const key = buildShiftKey(shift);
        if (seen.has(key)) {
            duplicates.push(shift);
            return;
        }

        seen.add(key);
        unique.push(shift);
    });

    return { unique, duplicates };
};

const dedupeAbsences = (absences) => {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    absences.forEach((absence) => {
        const key = buildAbsenceKey(absence);
        if (seen.has(key)) {
            duplicates.push(absence);
            return;
        }

        seen.add(key);
        unique.push(absence);
    });

    return { unique, duplicates };
};

const filterExistingDuplicateShifts = async (pool, serviceId, month, shifts) => {
    if (!shifts.length) return { shifts, skipped: 0 };

    const [existingRows] = await pool.query(
        `
        SELECT employeeId, scheduleDate, startTime, endTime
        FROM serviceScheduleShifts
        WHERE serviceId = ?
          AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?
          AND status = 'scheduled'
          AND deletedAt IS NULL
        `,
        [serviceId, month]
    );

    const existingKeys = new Set(existingRows.map(buildShiftKey));
    const filtered = [];
    let skipped = 0;

    shifts.forEach((shift) => {
        if (existingKeys.has(buildShiftKey(shift))) {
            skipped += 1;
            return;
        }
        filtered.push(shift);
    });

    return { shifts: filtered, skipped };
};

const filterExistingDuplicateAbsences = async (pool, month, absences) => {
    if (!absences.length) return { absences, skipped: 0 };

    const employeeIds = [...new Set(absences.map((absence) => absence.employeeId))];
    const placeholders = employeeIds.map(() => '?').join(',');
    const [year, monthValue] = month.split('-').map(Number);
    const monthStart = `${year}-${pad(monthValue)}-01`;
    const monthEnd = `${year}-${pad(monthValue)}-${pad(getDaysInMonth(month))}`;

    const [existingRows] = await pool.query(
        `
        SELECT employeeId, startDate, endDate, type
        FROM employeeAbsences
        WHERE employeeId IN (${placeholders})
          AND startDate <= ?
          AND endDate >= ?
        `,
        [...employeeIds, monthEnd, monthStart]
    );

    const existingKeys = new Set(existingRows.map(buildAbsenceKey));
    const filtered = [];
    let skipped = 0;

    absences.forEach((absence) => {
        if (existingKeys.has(buildAbsenceKey(absence))) {
            skipped += 1;
            return;
        }
        filtered.push(absence);
    });

    return { absences: filtered, skipped };
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

const isImageFile = ({ filePath = '', fileName = '', mimeType = '' } = {}) =>
    String(mimeType).startsWith('image/') ||
    /\.(jpe?g|png|webp|tiff?|avif)$/i.test(String(fileName || filePath));

const groupPositions = (positions, gap = 2) => {
    const groups = [];
    positions.forEach((position) => {
        const current = groups[groups.length - 1];
        if (current && position - current.end <= gap) {
            current.end = position;
            return;
        }
        groups.push({ start: position, end: position });
    });
    return groups.map((group) => Math.round((group.start + group.end) / 2));
};

const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};

const findRegularLineRun = (lines, expectedCount) => {
    let best = null;

    for (let start = 0; start < lines.length - 1; start += 1) {
        const spacings = [];
        const run = [lines[start]];

        for (let index = start + 1; index < lines.length; index += 1) {
            const spacing = lines[index] - lines[index - 1];
            const reference = median(spacings) || spacing;
            if (spacing >= 14 && spacing <= 45 && Math.abs(spacing - reference) <= 4) {
                run.push(lines[index]);
                spacings.push(spacing);
            } else if (run.length >= expectedCount) {
                break;
            } else {
                run.length = 0;
                break;
            }
        }

        if (!run.length) continue;
        if (!best || run.length > best.length) best = run;
        if (run.length >= expectedCount) break;
    }

    if (!best || best.length < 8) {
        generateErrorUtil('No se pudo detectar la rejilla del cuadrante', 400);
    }

    return best;
};

const getImageVector = (data, info, centerX, centerY, radius = 8) => {
    const vector = [];
    let darkPixels = 0;

    for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
            const px = Math.round(centerX + x);
            const py = Math.round(centerY + y);
            const value =
                px >= 0 && px < info.width && py >= 0 && py < info.height
                    ? data[py * info.width + px]
                    : 255;
            const dark = value < 120 ? 1 : 0;
            darkPixels += dark;
            vector.push(dark);
        }
    }

    return { vector, darkPixels };
};

const vectorDistance = (left, right) =>
    left.reduce((sum, value, index) => sum + (value === right[index] ? 0 : 1), 0);

const renderCodePrototype = async (code, size = 17) => {
    const safeCode = String(code || '')
        .replace(/[<>&'"]/g, '')
        .slice(0, 3);
    const fontSize = safeCode.length > 1 ? 10 : 13;
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="white"/>
            <text x="${size / 2}" y="${size - 4}" text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="${fontSize}" font-weight="700" fill="black">${safeCode}</text>
        </svg>
    `;
    const { data: rendered } = await sharp(Buffer.from(svg))
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    return [...rendered].map((value) => (value < 140 ? 1 : 0));
};

const buildImageCodeClassifier = async (data, info, codeMappings) => {
    const prototypes = {};

    await Promise.all(
        Object.keys(codeMappings).map(async (code) => {
            prototypes[code] = await renderCodePrototype(code);
        })
    );

    return (centerX, centerY) => {
        const sample = getImageVector(data, info, centerX, centerY);
        if (sample.darkPixels < 12) return '';

        let bestCode = '';
        let bestDistance = Number.MAX_SAFE_INTEGER;

        Object.entries(prototypes).forEach(([code, prototype]) => {
            const distance = vectorDistance(sample.vector, prototype);
            if (distance < bestDistance) {
                bestCode = code;
                bestDistance = distance;
            }
        });

        return bestDistance <= 130 ? bestCode : '';
    };
};

const findEmployee = (employees, excelName) => {
    const normalized = normalizeName(excelName);
    if (!normalized) return null;
    const excelTokens = nameTokens(excelName);
    const exact = employees.find(
        (employee) => employee.normalizedName === normalized
    );
    if (exact) return exact;

    const hasEnoughSpecificity =
        excelTokens.length >= 2 || normalized.length >= 8;
    if (!hasEnoughSpecificity) return null;

    const scored = employees
        .map((employee) => ({
            employee,
            score: scoreEmployeeMatch(employee, excelName),
        }))
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1];
    if (!best || best.score < 0.82) return null;
    if (second && best.score - second.score < 0.12) return null;

    return best.employee;
};

const resolveEmployeeForImportRow = (employees, sourceName, employeeMappings) => {
    const mappedEmployeeId =
        employeeMappings[sourceName] || employeeMappings[normalizeName(sourceName)];
    const mappedEmployee = mappedEmployeeId
        ? employees.find((employee) => employee.id === mappedEmployeeId)
        : null;

    return mappedEmployee || findEmployee(employees, sourceName);
};

const registerUnmatched = (unmatchedMap, employees, sourceName, count = 1) => {
    const current = unmatchedMap.get(sourceName) || {
        excelName: sourceName,
        shiftCount: 0,
        suggestions: sourceName.startsWith('Fila ')
            ? []
            : suggestEmployees(employees, sourceName),
    };
    current.shiftCount += count;
    unmatchedMap.set(sourceName, current);
};

const normalizeImageCodeMappings = (value = {}) => {
    const normalized = {};

    Object.entries(value || {}).forEach(([rawCode, rawConfig]) => {
        const code = String(rawCode || '')
            .trim()
            .toUpperCase();
        if (!code) return;

        const config = rawConfig || {};
        const type = String(config.type || '').trim();

        if (type === 'shift') {
            const startTime = normalizeImportTime(config.startTime);
            const endTime = normalizeImportTime(config.endTime);
            if (!startTime || !endTime) return;
            normalized[code] = {
                type: 'shift',
                startTime,
                endTime,
                label: config.label || `Turno ${code}`,
            };
            return;
        }

        if (type === 'absence') {
            const absenceType = ['vacation', 'off', 'available', 'sick'].includes(
                config.absenceType
            )
                ? config.absenceType
                : 'vacation';
            normalized[code] = {
                type: 'absence',
                absenceType,
                notes:
                    config.notes ||
                    `Importado desde cuadrante de imagen (${code})`,
                label: config.label || `Ausencia ${code}`,
            };
        }
    });

    return normalized;
};

const buildCodeLegend = (codeMappings) =>
    Object.fromEntries(
        Object.entries(codeMappings).map(([code, config]) => {
            if (config.type === 'shift') {
                return [
                    code,
                    `${config.label || `Turno ${code}`} ${config.startTime.slice(
                        0,
                        5
                    )}-${config.endTime.slice(0, 5)}`,
                ];
            }

            return [code, config.label || config.absenceType || 'Ausencia'];
        })
    );

const parseImageSchedule = async ({
    filePath,
    month,
    employees,
    employeeMappings = {},
    scheduleCodeMappings = {},
}) => {
    const codeMappings = normalizeImageCodeMappings(scheduleCodeMappings);
    if (!Object.keys(codeMappings).length) {
        generateErrorUtil(
            'Indica que significa cada letra del cuadrante antes de importarlo',
            400
        );
    }

    const { data, info } = await sharp(filePath)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const darkAt = (x, y) => data[y * info.width + x] < 100;
    const verticalCandidates = [];
    const yStart = Math.floor(info.height * 0.2);
    const yEnd = Math.floor(info.height * 0.98);

    for (let x = 0; x < info.width; x += 1) {
        let score = 0;
        for (let y = yStart; y < yEnd; y += 1) {
            if (darkAt(x, y)) score += 1;
        }
        if (score > (yEnd - yStart) * 0.35) verticalCandidates.push(x);
    }

    const allVerticalLines = groupPositions(verticalCandidates);
    const dayColumnLines = findRegularLineRun(allVerticalLines, 32).slice(0, 32);
    const left = dayColumnLines[0];
    const right = dayColumnLines[dayColumnLines.length - 1];

    const horizontalCandidates = [];
    for (let y = 0; y < info.height; y += 1) {
        let score = 0;
        for (let x = left; x <= right; x += 1) {
            if (darkAt(x, y)) score += 1;
        }
        if (score > (right - left) * 0.55) horizontalCandidates.push(y);
    }

    const rowLines = groupPositions(horizontalCandidates);
    if (rowLines.length < 5) {
        generateErrorUtil('No se pudieron detectar las filas del cuadrante', 400);
    }

    const classifyCode = await buildImageCodeClassifier(
        data,
        info,
        codeMappings
    );
    const monthDays = getDaysInMonth(month);
    const dayCount = Math.min(monthDays, dayColumnLines.length - 1);
    const shifts = [];
    const absences = [];
    const employeeRows = [];
    const unknownEmployees = new Set();
    const unmatchedMap = new Map();

    for (let rowIndex = 0; rowIndex < rowLines.length - 4; rowIndex += 1) {
        const top = rowLines[rowIndex + 3];
        const bottom = rowLines[rowIndex + 4];
        const centerY = (top + bottom) / 2;
        const excelName = `Fila ${rowIndex + 1}`;
        const employee = resolveEmployeeForImportRow(
            employees,
            excelName,
            employeeMappings
        );
        let rowEntryCount = 0;
        const rowShifts = [];
        const rowAbsences = [];

        for (let day = 1; day <= dayCount; day += 1) {
            const centerX = (dayColumnLines[day - 1] + dayColumnLines[day]) / 2;
            const code = classifyCode(centerX, centerY);
            if (!code) continue;

            const scheduleDate = buildDateString(month, day);
            const codeConfig = codeMappings[code];
            if (!codeConfig) continue;

            if (codeConfig.type === 'shift') {
                rowEntryCount += 1;
                rowShifts.push({
                    employee,
                    excelName,
                    code,
                    scheduleDate,
                    startTime: codeConfig.startTime,
                    endTime: codeConfig.endTime,
                });
            } else if (codeConfig.type === 'absence') {
                rowEntryCount += 1;
                rowAbsences.push({
                    employee,
                    excelName,
                    code,
                    startDate: scheduleDate,
                    endDate: scheduleDate,
                    type: codeConfig.absenceType,
                    notes: codeConfig.notes,
                });
            }
        }

        if (!rowEntryCount) continue;

        employeeRows.push({
            row: rowIndex + 1,
            excelName,
            employeeId: employee?.id || null,
            employeeName: employee?.fullName || null,
        });

        if (!employee) {
            unknownEmployees.add(excelName);
            registerUnmatched(unmatchedMap, employees, excelName, rowEntryCount);
            continue;
        }

        rowShifts.forEach((item) => {
            shifts.push({
                employeeId: employee.id,
                employeeName: employee.fullName,
                excelName: item.excelName,
                sourceCode: item.code,
                scheduleDate: item.scheduleDate,
                startTime: item.startTime,
                endTime: item.endTime,
                hours: calculateShiftHours(item.startTime, item.endTime),
            });
        });

        rowAbsences.forEach((item) => {
            absences.push({
                employeeId: employee.id,
                employeeName: employee.fullName,
                excelName: item.excelName,
                sourceCode: item.code,
                startDate: item.startDate,
                endDate: item.endDate,
                type: item.type,
                notes: item.notes,
            });
        });
    }

    const { unique: uniqueShifts, duplicates } = dedupeShifts(shifts);

    return {
        worksheetName: 'Imagen',
        serviceName: '',
        month,
        sourceType: 'image',
        codeLegend: buildCodeLegend(codeMappings),
        employeeRows,
        unknownEmployees: [...unknownEmployees],
        unmatchedEmployees: [...unmatchedMap.values()],
        shifts: uniqueShifts,
        absences,
        shiftCount: uniqueShifts.length,
        absenceCount: absences.length,
        duplicateShiftCount: duplicates.length,
    };
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
    const { rowNumber: dayHeaderRow, columns: dayColumns } =
        findDayColumns(worksheet);
    const startRow = Math.max(FIRST_EMPLOYEE_ROW, dayHeaderRow + 2);

    for (
        let rowNumber = startRow;
        rowNumber <= worksheet.rowCount;
        rowNumber += 1
    ) {
        const rawName = getEmployeeNameFromRow(worksheet, rowNumber);
        if (!rawName || rawName.toLowerCase().includes('dos apellidos')) continue;
        if (rawName.toLowerCase() === 'n.º') continue;

        if (isPlaceholderName(rawName)) continue;
        if (!rowHasShiftTimes(worksheet, rowNumber, dayColumns)) continue;

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

        for (const { col, day } of dayColumns) {
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

        rowNumber += EMPLOYEE_BLOCK_SIZE - 1;
    }

    const { unique: uniqueShifts, duplicates } = dedupeShifts(shifts);

    return {
        worksheetName: worksheet.name,
        serviceName: String(serviceName || '').trim(),
        month,
        employeeRows,
        unknownEmployees: [...unknownEmployees],
        unmatchedEmployees: [...unmatchedMap.values()],
        shifts: uniqueShifts,
        absences: [],
        shiftCount: uniqueShifts.length,
        absenceCount: 0,
        duplicateShiftCount: duplicates.length,
    };
};

const importServiceScheduleExcelService = async ({
    serviceId,
    filePath,
    fileName = '',
    mimeType = '',
    month,
    apply = false,
    replace = true,
    employeeMappings = {},
    scheduleCodeMappings = {},
    createdBy,
    allowOverlap = false,
}) => {
    if (!filePath) generateErrorUtil('Archivo Excel requerido', 400);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        generateErrorUtil('Mes invalido', 400);
    }

    const pool = await getPool();
    const employees = await loadEmployees(pool);
    const preview = isImageFile({ filePath, fileName, mimeType })
        ? await parseImageSchedule({
              filePath,
              month,
              employees,
              employeeMappings,
              scheduleCodeMappings,
          })
        : await parseWorkbook({
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

    const existingFilter = replace
        ? { shifts: preview.shifts, skipped: 0 }
        : await filterExistingDuplicateShifts(
              pool,
              serviceId,
              month,
              preview.shifts
          );
    const shiftsToInsert = existingFilter.shifts;
    const { unique: uniqueAbsences, duplicates: duplicateAbsences } =
        dedupeAbsences(preview.absences || []);
    const absenceFilter = await filterExistingDuplicateAbsences(
        pool,
        month,
        uniqueAbsences
    );
    const absencesToInsert = absenceFilter.absences;

    const breakdowns = await calculateShiftHourBreakdowns(
        pool,
        serviceId,
        shiftsToInsert
    );

    await validateEmployeeShiftOverlapsService(
        pool,
        shiftsToInsert.map((shift) => ({
            ...shift,
            serviceId,
        })),
        replace
            ? {
                  ignoreServiceId: serviceId,
                  ignoreMonth: month,
                  allowOverlap,
              }
            : { allowOverlap }
    );

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

        for (let index = 0; index < shiftsToInsert.length; index += 1) {
            const shift = shiftsToInsert[index];
            const breakdown = breakdowns[index] || {};
            await conn.query(
                `
                INSERT INTO serviceScheduleShifts
                    (
                        id, serviceId, employeeId, scheduleDate, startTime,
                        endTime, hours, realHours, nightHours, holidayHours,
                        regularHours, status, createdBy
                    )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
                `,
                [
                    uuid(),
                    serviceId,
                    shift.employeeId,
                    shift.scheduleDate,
                    shift.startTime,
                    shift.endTime,
                    breakdown.hours ?? shift.hours,
                    breakdown.realHours ?? shift.hours,
                    breakdown.nightHours ?? 0,
                    breakdown.holidayHours ?? 0,
                    breakdown.regularHours ?? shift.hours,
                    createdBy,
                ]
            );
        }

        for (const absence of absencesToInsert) {
            await conn.query(
                `
                INSERT INTO employeeAbsences
                    (id, employeeId, startDate, endDate, type, notes, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    uuid(),
                    absence.employeeId,
                    absence.startDate,
                    absence.endDate,
                    absence.type,
                    absence.notes || null,
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

    await saveServiceScheduleSnapshot(pool, serviceId, month, createdBy);

    return {
        ...preview,
        shifts: shiftsToInsert,
        absences: absencesToInsert,
        shiftCount: shiftsToInsert.length,
        absenceCount: absencesToInsert.length,
        applied: true,
        replaced: replace,
        skippedExistingShiftCount: existingFilter.skipped,
        skippedExistingAbsenceCount: absenceFilter.skipped,
        duplicateAbsenceCount: duplicateAbsences.length,
    };
};

export default importServiceScheduleExcelService;
