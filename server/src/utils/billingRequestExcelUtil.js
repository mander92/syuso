import fsPromises from 'fs/promises';
import path from 'path';

import ExcelJS from 'exceljs';

import { UPLOADS_DIR } from '../../env.js';

const monthNames = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
];

const normalizeSheetName = (value) =>
    String(value || 'SIN DELEGACION')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\\/*?:[\]]/g, ' ')
        .trim()
        .toUpperCase()
        .slice(0, 31) || 'SIN DELEGACION';

const formatMonthName = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return monthNames[date.getMonth()] || '';
};

const formatAddress = (service = {}) =>
    [
        service.clientAddress,
        service.clientPostCode,
        service.clientCity,
        service.clientProvince,
    ]
        .filter(Boolean)
        .join(', ');

const setColumns = (worksheet) => {
    worksheet.columns = [
        { key: 'client', width: 34 },
        { key: 'taxId', width: 16 },
        { key: 'address', width: 42 },
        { key: 'hourlyRate', width: 14 },
        { key: 'hours', width: 18 },
        { key: 'concept', width: 26 },
        { key: 'subtotal', width: 14 },
        { key: 'vat', width: 14 },
        { key: 'total', width: 14 },
        { key: 'invoiceDate', width: 16 },
        { key: 'contact', width: 28 },
        { key: 'sent', width: 14 },
    ];
};

const styleHeaderRow = (row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF071B4D' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
};

const styleSectionRow = (row) => {
    row.font = { bold: true, color: { argb: 'FF071B4D' } };
    row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EEF6' },
    };
};

const styleDataRange = (worksheet, firstRow, lastRow) => {
    for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD8E0EB' } },
                left: { style: 'thin', color: { argb: 'FFD8E0EB' } },
                bottom: { style: 'thin', color: { argb: 'FFD8E0EB' } },
                right: { style: 'thin', color: { argb: 'FFD8E0EB' } },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
    }
};

const addSheetContent = ({ worksheet, records, periodStart }) => {
    setColumns(worksheet);
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

    worksheet.getCell('A2').value = 'MES';
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('B2').value = formatMonthName(periodStart);
    worksheet.getCell('B2').font = { bold: true };

    worksheet.getCell('A3').value = 'PENDIENTE FACTURAR';
    styleSectionRow(worksheet.getRow(3));

    const header = [
        'CLIENTE',
        'CIF/DNI',
        'DIRECCION',
        'PRECIO/HORA',
        'HORAS A FACTURAR',
        'CONCEPTO',
        'TOTAL',
        'IVA',
        'TOTAL + IVA',
        'FECHA FACTURA',
        'CONTACTO ENVIO',
        'ENVIADO',
    ];
    worksheet.getRow(4).values = header;
    styleHeaderRow(worksheet.getRow(4));

    records.forEach((record, index) => {
        const rowNumber = index + 5;
        const row = worksheet.getRow(rowNumber);
        row.values = [
            record.service.clientDisplayName ||
                record.service.clientName ||
                record.service.name,
            record.service.clientTaxId || '',
            formatAddress(record.service),
            record.hourlyRate,
            record.totalHours,
            record.concept,
            record.subtotal,
            record.vatAmount,
            record.amount,
            '',
            record.service.clientDocumentationEmail ||
                record.service.clientEmail ||
                '',
            '',
        ];

        row.getCell(4).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(8).numFmt = '#,##0.00';
        row.getCell(9).numFmt = '#,##0.00';
    });

    const lastRow = Math.max(records.length + 4, 5);
    styleDataRange(worksheet, 4, lastRow);
    worksheet.autoFilter = {
        from: 'A4',
        to: `L${lastRow}`,
    };
};

const createBillingRequestExcelUtil = async ({ records, periodStart, periodEnd }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SYUSO';
    workbook.created = new Date();

    const grouped = records.reduce((acc, record) => {
        const sheetName = normalizeSheetName(record.service.province);
        if (!acc[sheetName]) acc[sheetName] = [];
        acc[sheetName].push(record);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([sheetName, sheetRecords]) => {
        const worksheet = workbook.addWorksheet(sheetName);
        addSheetContent({ worksheet, records: sheetRecords, periodStart, periodEnd });
    });

    if (!workbook.worksheets.length) {
        const worksheet = workbook.addWorksheet('FACTURAS');
        addSheetContent({ worksheet, records: [], periodStart, periodEnd });
    }

    const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR || 'uploads');
    const outputDir = path.join(uploadsRoot, 'billing', 'requests');
    await fsPromises.mkdir(outputDir, { recursive: true });

    const safePeriod = `${periodStart || 'inicio'}_${periodEnd || 'fin'}`.replace(
        /[^\w-]+/g,
        '_'
    );
    const fileName = `Solicitud facturas ${safePeriod}.xlsx`;
    const filePath = path.join(outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    return {
        fileName,
        filePath,
        relativePath: `billing/requests/${fileName}`,
    };
};

export default createBillingRequestExcelUtil;
