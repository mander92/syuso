import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { UPLOADS_DIR } from '../../env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../templates/schedule-template.xlsx');
const DAY_START_COL = 5;
const DAY_END_COL = 35;
const FIRST_EMPLOYEE_ROW = 12;
const EMPLOYEE_BLOCK_SIZE = 4;
const EMPLOYEE_BLOCKS_PER_SHEET = 9;

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

const cloneValue = (value) => {
    if (value instanceof Date) return new Date(value.getTime());
    if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
    return value;
};

const cloneWorksheetFromTemplate = (source, target) => {
    target.properties = { ...source.properties };
    target.pageSetup = JSON.parse(JSON.stringify(source.pageSetup || {}));
    target.pageMargins = JSON.parse(JSON.stringify(source.pageMargins || {}));
    target.headerFooter = JSON.parse(JSON.stringify(source.headerFooter || {}));
    target.views = JSON.parse(JSON.stringify(source.views || []));
    target.autoFilter = source.autoFilter;

    source.columns.forEach((column, index) => {
        target.getColumn(index + 1).width = column.width;
        target.getColumn(index + 1).hidden = column.hidden;
        target.getColumn(index + 1).outlineLevel = column.outlineLevel;
        target.getColumn(index + 1).style = JSON.parse(
            JSON.stringify(column.style || {})
        );
    });

    source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const targetRow = target.getRow(rowNumber);
        targetRow.height = row.height;
        targetRow.hidden = row.hidden;
        targetRow.outlineLevel = row.outlineLevel;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = target.getCell(rowNumber, colNumber);
            targetCell.value = cloneValue(cell.value);
            targetCell.style = JSON.parse(JSON.stringify(cell.style || {}));
            if (cell.numFmt) targetCell.numFmt = cell.numFmt;
        });
    });

    (source.model.merges || []).forEach((merge) => target.mergeCells(merge));
};

const getMonthDays = (month) => {
    const [year, monthValue] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
    const weekdays = ['do', 'lu', 'ma', 'mie', 'ju', 'vi', 'sa'];

    return Array.from({ length: 31 }, (_, index) => {
        const dayNumber = index + 1;
        if (dayNumber > daysInMonth) {
            return { dayNumber: '', weekday: '', dateKey: '' };
        }
        const date = new Date(Date.UTC(year, monthValue - 1, dayNumber));
        const dateKey = `${year}-${String(monthValue).padStart(2, '0')}-${String(
            dayNumber
        ).padStart(2, '0')}`;
        return {
            dayNumber,
            weekday: weekdays[date.getUTCDay()],
            dateKey,
        };
    });
};

const parseTime = (value) => {
    const text = String(value || '').split('\n')[0].trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return (hours * 60 + minutes) / (24 * 60);
};

const calculateDuration = (start, end) => {
    if (start === null || end === null) return null;
    return end >= start ? end - start : end - start + 1;
};

const fillMonth = (worksheet, month) => {
    const [year, monthValue] = month.split('-').map(Number);
    worksheet.getCell('A5').value = new Date(Date.UTC(year, monthValue - 1, 1));
};

const fillServiceMeta = (worksheet, meta) => {
    worksheet.getCell('K2').value = meta.center || '';
    worksheet.getCell('K3').value = meta.phone || '';
    worksheet.getCell('AA3').value = meta.category || '';
    worksheet.getCell('K4').value = meta.address || '';
    worksheet.getCell('N5').value = meta.description || '';
};

const fillDays = (worksheet, month) => {
    const days = getMonthDays(month);
    days.forEach((day, index) => {
        const col = DAY_START_COL + index;
        worksheet.getCell(9, col).value = day.weekday;
        worksheet.getCell(10, col).value = day.dayNumber;
    });
};

const clearEmployeeBlock = (worksheet, baseRow) => {
    worksheet.getCell(baseRow, 1).value = null;
    worksheet.getCell(baseRow + 1, 1).value = null;

    for (let col = DAY_START_COL; col <= DAY_END_COL; col += 1) {
        worksheet.getCell(baseRow, col).value = null;
        worksheet.getCell(baseRow + 1, col).value = null;
        worksheet.getCell(baseRow + 2, col).value = {
            formula: `IF(${worksheet.getCell(baseRow, col).address}>0,IF(${worksheet.getCell(baseRow, col).address}>${worksheet.getCell(baseRow + 1, col).address},${worksheet.getCell(baseRow + 1, col).address}-${worksheet.getCell(baseRow, col).address}+1,(${worksheet.getCell(baseRow + 1, col).address}-${worksheet.getCell(baseRow, col).address})),"-")`,
            result: '-',
        };
    }

    worksheet.getCell(baseRow, 36).value = {
        formula: `SUM(E${baseRow + 2}:AI${baseRow + 2})`,
        result: null,
    };
};

const fillEmployeeBlock = (worksheet, row, days, blockIndex, dailyTotals) => {
    const baseRow = FIRST_EMPLOYEE_ROW + blockIndex * EMPLOYEE_BLOCK_SIZE;
    clearEmployeeBlock(worksheet, baseRow);
    worksheet.getCell(baseRow, 1).value = row.name || '';
    let employeeTotal = 0;

    days.forEach((day, index) => {
        if (!day.dateKey) return;
        const col = DAY_START_COL + index;
        const start = parseTime(row.startsByDay?.[day.dateKey]);
        const end = parseTime(row.endsByDay?.[day.dateKey]);
        const duration = calculateDuration(start, end);

        worksheet.getCell(baseRow, col).value = start;
        worksheet.getCell(baseRow + 1, col).value = end;
        worksheet.getCell(baseRow + 2, col).value = {
            formula: `IF(${worksheet.getCell(baseRow, col).address}>0,IF(${worksheet.getCell(baseRow, col).address}>${worksheet.getCell(baseRow + 1, col).address},${worksheet.getCell(baseRow + 1, col).address}-${worksheet.getCell(baseRow, col).address}+1,(${worksheet.getCell(baseRow + 1, col).address}-${worksheet.getCell(baseRow, col).address})),"-")`,
            result: duration === null ? '-' : duration,
        };

        if (duration !== null) {
            dailyTotals[index] = (dailyTotals[index] || 0) + duration;
            employeeTotal += duration;
        }
    });

    worksheet.getCell(baseRow, 36).value = {
        formula: `SUM(E${baseRow + 2}:AI${baseRow + 2})`,
        result: employeeTotal || null,
    };
};

const fillSheetTotals = (worksheet, dailyTotals) => {
    const hourRows = Array.from({ length: EMPLOYEE_BLOCKS_PER_SHEET }, (_, index) =>
        FIRST_EMPLOYEE_ROW + index * EMPLOYEE_BLOCK_SIZE + 2
    );
    let monthlyTotal = 0;

    for (let col = DAY_START_COL; col <= DAY_END_COL; col += 1) {
        const index = col - DAY_START_COL;
        const total = dailyTotals[index] || 0;
        monthlyTotal += total;
        worksheet.getCell(48, col).value = {
            formula: `SUM(${hourRows
                .map((rowNumber) => worksheet.getCell(rowNumber, col).address)
                .join(',')})`,
            result: total || null,
        };
    }

    worksheet.getCell(48, 36).value = {
        formula: 'SUM(E48:AI48)',
        result: monthlyTotal || null,
    };
    worksheet.getCell(50, 36).value = {
        formula: 'SUM(AJ12,AJ16,AJ20,AJ24,AJ28,AJ32,AJ36,AJ40,AJ44)',
        result: monthlyTotal || null,
    };
};

const prepareSheet = (worksheet, section, rows) => {
    fillMonth(worksheet, section.month);
    fillServiceMeta(worksheet, section.meta || {});
    fillDays(worksheet, section.month);

    for (let index = 0; index < EMPLOYEE_BLOCKS_PER_SHEET; index += 1) {
        clearEmployeeBlock(
            worksheet,
            FIRST_EMPLOYEE_ROW + index * EMPLOYEE_BLOCK_SIZE
        );
    }

    const days = getMonthDays(section.month);
    const dailyTotals = Array.from({ length: 31 }, () => 0);
    rows.forEach((row, index) =>
        fillEmployeeBlock(worksheet, row, days, index, dailyTotals)
    );
    fillSheetTotals(worksheet, dailyTotals);
};

export const createScheduleGridExcelUtil = async ({ sections, fileName }) => {
    const baseDir = path.join(process.cwd(), UPLOADS_DIR, 'documents', 'schedules');
    await ensureDir(baseDir);

    const safeFileName = fileName || `schedule-${Date.now()}.xlsx`;
    const filePath = path.join(baseDir, safeFileName);

    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.readFile(TEMPLATE_PATH);
    const pristineSheet =
        templateWorkbook.getWorksheet('VIGILANTES') || templateWorkbook.worksheets[0];

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);
    workbook.creator = 'SYUSO';
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const templateSheet = workbook.getWorksheet('VIGILANTES') || workbook.worksheets[0];
    const sheetModels = [];

    sections.forEach((section) => {
        const rows = section.rows || [];
        const chunks = [];
        for (let index = 0; index < Math.max(rows.length, 1); index += EMPLOYEE_BLOCKS_PER_SHEET) {
            chunks.push(rows.slice(index, index + EMPLOYEE_BLOCKS_PER_SHEET));
        }
        sheetModels.push({ section, chunks });
    });

    let sheetIndex = 0;
    sheetModels.forEach(({ section, chunks }) => {
        chunks.forEach((rows) => {
            const worksheet =
                sheetIndex === 0
                    ? templateSheet
                    : workbook.addWorksheet(
                          `VIGILANTES ${String(sheetIndex + 1).padStart(2, '0')}`
                      );

            if (sheetIndex > 0) {
                cloneWorksheetFromTemplate(pristineSheet, worksheet);
            }

            prepareSheet(worksheet, section, rows);
            sheetIndex += 1;
        });
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
};
