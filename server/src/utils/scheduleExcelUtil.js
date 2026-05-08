import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { UPLOADS_DIR } from '../../env.js';

const DAY_START_COL = 5;
const FIRST_EMPLOYEE_ROW = 12;
const EMPLOYEE_BLOCK_SIZE = 4;

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

const getMonthDays = (month) => {
    const [year, monthValue] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
    const weekdays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

    return Array.from({ length: daysInMonth }, (_, index) => {
        const dayNumber = index + 1;
        const date = new Date(Date.UTC(year, monthValue - 1, dayNumber));
        const weekday = weekdays[date.getUTCDay()];
        const isWeekend = weekday === 'S' || weekday === 'D';
        const dateKey = `${year}-${String(monthValue).padStart(2, '0')}-${String(
            dayNumber
        ).padStart(2, '0')}`;
        return { dayNumber, weekday, isWeekend, dateKey };
    });
};

const formatMonthLabel = (month) => {
    const [year, monthValue] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        month: 'long',
        year: 'numeric',
    })
        .format(new Date(Date.UTC(year, monthValue - 1, 1)))
        .toUpperCase();
};

const applyBorder = (cell) => {
    cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    };
};

const styleCell = (cell, options = {}) => {
    cell.alignment = {
        vertical: 'middle',
        horizontal: options.horizontal || 'center',
        wrapText: true,
    };
    cell.font = {
        name: 'Arial',
        size: options.size || 8,
        bold: Boolean(options.bold),
        color: { argb: options.color || 'FF111827' },
    };
    if (options.fill) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: options.fill },
        };
    }
    applyBorder(cell);
};

const addHeader = (worksheet, section, monthLabel) => {
    worksheet.mergeCells('A1:D2');
    worksheet.getCell('A1').value = 'Mes y Año';
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

    worksheet.mergeCells('E1:J2');
    worksheet.getCell('E1').value = monthLabel;

    worksheet.mergeCells('K1:AI2');
    worksheet.getCell('K1').value = section.meta.center || '';

    worksheet.getCell('A4').value = 'Centro:';
    worksheet.getCell('B4').value = section.meta.center || '';
    worksheet.getCell('A5').value = 'Telefono:';
    worksheet.getCell('B5').value = section.meta.phone || '';
    worksheet.getCell('A6').value = 'Direccion:';
    worksheet.getCell('B6').value = section.meta.address || '';
    worksheet.getCell('A7').value = 'Categoria:';
    worksheet.getCell('B7').value = section.meta.category || '';
    worksheet.getCell('F5').value = 'Descripcion del servicio:';
    worksheet.getCell('K5').value = section.meta.description || '';

    ['A4', 'A5', 'A6', 'A7', 'F5'].forEach((address) => {
        worksheet.getCell(address).font = { name: 'Arial', size: 9, bold: true };
    });

    ['E1', 'K1'].forEach((address) => {
        worksheet.getCell(address).alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true,
        };
        worksheet.getCell(address).font = { name: 'Arial', size: 12, bold: true };
    });

    worksheet.mergeCells('A10:C11');
    worksheet.getCell('A10').value = 'Dos apellidos y nombre';
    styleCell(worksheet.getCell('A10'), { bold: true, fill: 'FFE5E7EB' });
    worksheet.getCell('D10').value = '';
    styleCell(worksheet.getCell('D10'), { bold: true, fill: 'FFE5E7EB' });
    worksheet.getCell('D11').value = '';
    styleCell(worksheet.getCell('D11'), { bold: true, fill: 'FFE5E7EB' });

    worksheet.mergeCells('AJ10:AJ11');
    worksheet.getCell('AJ10').value = 'TOTAL HORAS';
    styleCell(worksheet.getCell('AJ10'), { bold: true, fill: 'FFE5E7EB' });
};

const addDays = (worksheet, days) => {
    days.forEach((day, index) => {
        const column = DAY_START_COL + index;
        const weekdayCell = worksheet.getCell(9, column);
        const dayCell = worksheet.getCell(10, column);

        weekdayCell.value = day.weekday;
        dayCell.value = day.dayNumber;

        const fill = day.isWeekend ? 'FFFFD6D6' : 'FFF3F4F6';
        styleCell(weekdayCell, { bold: true, fill });
        styleCell(dayCell, { bold: true, fill });
    });
};

const addRows = (worksheet, days, rows) => {
    rows.forEach((row, rowIndex) => {
        const baseRow = FIRST_EMPLOYEE_ROW + rowIndex * EMPLOYEE_BLOCK_SIZE;

        worksheet.mergeCells(baseRow, 1, baseRow + 2, 3);
        const nameCell = worksheet.getCell(baseRow, 1);
        nameCell.value = row.name;
        styleCell(nameCell, { bold: true, horizontal: 'left' });

        worksheet.getCell(baseRow, 4).value = 'Entrada';
        worksheet.getCell(baseRow + 1, 4).value = 'Salida';
        worksheet.getCell(baseRow + 2, 4).value = 'Horas';

        [baseRow, baseRow + 1, baseRow + 2].forEach((line) => {
            worksheet.getRow(line).height = 18;
            styleCell(worksheet.getCell(line, 4), { bold: true, fill: 'FFF9FAFB' });
        });

        days.forEach((day, index) => {
            const column = DAY_START_COL + index;
            const fill = day.isWeekend ? 'FFFFECEC' : undefined;
            const startCell = worksheet.getCell(baseRow, column);
            const endCell = worksheet.getCell(baseRow + 1, column);
            const hoursCell = worksheet.getCell(baseRow + 2, column);

            startCell.value = row.startsByDay?.[day.dateKey] || '';
            endCell.value = row.endsByDay?.[day.dateKey] || '';
            hoursCell.value = row.hoursByDay?.[day.dateKey] || '';

            styleCell(startCell, { fill });
            styleCell(endCell, { fill });
            styleCell(hoursCell, { fill });
        });

        worksheet.mergeCells(baseRow, 36, baseRow + 2, 36);
        const totalCell = worksheet.getCell(baseRow, 36);
        totalCell.value = row.totalHours || '';
        styleCell(totalCell, { bold: true, fill: 'FFF9FAFB' });
    });
};

export const createScheduleGridExcelUtil = async ({ sections, fileName }) => {
    const baseDir = path.join(process.cwd(), UPLOADS_DIR, 'documents', 'schedules');
    await ensureDir(baseDir);

    const safeFileName = fileName || `schedule-${Date.now()}.xlsx`;
    const filePath = path.join(baseDir, safeFileName);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SYUSO';

    sections.forEach((section, index) => {
        const worksheet = workbook.addWorksheet(
            index === 0 ? 'VIGILANTES' : `VIGILANTES ${index + 1}`
        );
        const days = getMonthDays(section.month);
        const monthLabel = formatMonthLabel(section.month);

        worksheet.pageSetup = {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
        };
        worksheet.views = [{ showGridLines: false }];

        worksheet.columns = [
            { width: 12 },
            { width: 12 },
            { width: 12 },
            { width: 12 },
            ...Array.from({ length: 31 }, () => ({ width: 5 })),
            { width: 10 },
        ];

        addHeader(worksheet, section, monthLabel);
        addDays(worksheet, days);
        addRows(worksheet, days, section.rows);
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
};
