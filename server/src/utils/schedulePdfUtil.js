import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { UPLOADS_DIR } from '../../env.js';

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

const formatMonthLabel = (month) => {
    if (!month) return '';
    const [year, monthValue] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthValue - 1, 1));
    const label = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        month: 'long',
        year: 'numeric',
    }).format(date);
    return label.replace(' de ', ' ');
};

const getMonthDays = (month) => {
    const [year, monthValue] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
    const weekdays = ['do', 'lu', 'ma', 'mie', 'ju', 'vi', 'sa'];

    return Array.from({ length: daysInMonth }, (_, index) => {
        const dayNumber = index + 1;
        const date = new Date(Date.UTC(year, monthValue - 1, dayNumber));
        const weekday = weekdays[date.getUTCDay()];
        const isWeekend = weekday === 'sa' || weekday === 'do';
        const dateKey = `${year}-${String(monthValue).padStart(2, '0')}-${String(
            dayNumber
        ).padStart(2, '0')}`;
        return { dayNumber, weekday, isWeekend, dateKey };
    });
};

const drawHeader = (doc, meta, monthLabel) => {
    const startX = doc.page.margins.left;
    const startY = doc.y;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftWidth = Math.round(contentWidth * 0.72);
    const rightWidth = contentWidth - leftWidth;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');

    doc.text('Mes y Año', startX, startY);
    doc
        .font('Helvetica')
        .fontSize(10)
        .text(monthLabel || '', startX, startY + 14);

    const infoX = startX + 90;
    const infoY = startY;
    const lineGap = 14;

    doc.font('Helvetica-Bold').text('Centro:', infoX, infoY);
    doc.font('Helvetica').text(meta.center || '', infoX + 70, infoY);

    doc.font('Helvetica-Bold').text('Telefono:', infoX, infoY + lineGap);
    doc.font('Helvetica').text(meta.phone || '', infoX + 70, infoY + lineGap);

    doc.font('Helvetica-Bold').text('Direccion:', infoX, infoY + lineGap * 2);
    doc.font('Helvetica').text(meta.address || '', infoX + 70, infoY + lineGap * 2, {
        width: leftWidth - 80,
    });

    doc.font('Helvetica-Bold').text('Categoria:', infoX, infoY + lineGap * 3);
    doc.font('Helvetica').text(meta.category || '', infoX + 70, infoY + lineGap * 3);

    doc
        .font('Helvetica-Bold')
        .text('Descripcion del servicio:', infoX, infoY + lineGap * 4);
    doc.font('Helvetica').text(meta.description || '', infoX + 140, infoY + lineGap * 4, {
        width: leftWidth - 150,
    });

    const rightX = startX + leftWidth;
    doc.rect(rightX, startY, rightWidth, 22).stroke('#0f172a');
    doc.font('Helvetica-Bold').text('P.', rightX + 8, startY + 6);

    doc.moveDown(4);
};

const formatTimeRange = (timeValue) => {
    if (!timeValue) return '';
    const parts = timeValue.split(':');
    return `${parts[0]}:${parts[1]}`;
};

const drawGrid = (doc, days, rows) => {
    const startX = doc.page.margins.left;
    let y = doc.y + 8;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const nameColWidth = 140;
    const totalColWidth = 60;
    const dayColWidth = (pageWidth - nameColWidth - totalColWidth) / days.length;

    const headerHeight = 18;
    const dayHeight = 20;
    const rowHeight = 28;
    const hoursRowHeight = 18;

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');

    doc.rect(startX, y, nameColWidth, headerHeight).stroke('#cbd5f1');
    doc.text('Dos apellidos y nombre', startX + 4, y + 5, {
        width: nameColWidth - 8,
    });

    days.forEach((day, index) => {
        const x = startX + nameColWidth + index * dayColWidth;
        doc
            .rect(x, y, dayColWidth, headerHeight)
            .fillAndStroke(day.isWeekend ? '#fde2e2' : '#f8fafc', '#cbd5f1');
        doc
            .fillColor('#0f172a')
            .text(day.weekday, x + 2, y + 4, { width: dayColWidth - 4 });
    });

    const totalX = startX + nameColWidth + days.length * dayColWidth;
    doc
        .rect(totalX, y, totalColWidth, headerHeight)
        .fillAndStroke('#f8fafc', '#cbd5f1');
    doc.text('TOTAL HORAS', totalX + 4, y + 4, {
        width: totalColWidth - 8,
    });

    y += headerHeight;

    doc.font('Helvetica-Bold').fillColor('#0f172a');
    doc.rect(startX, y, nameColWidth, dayHeight).stroke('#cbd5f1');
    doc.text('', startX + 4, y + 5);

    days.forEach((day, index) => {
        const x = startX + nameColWidth + index * dayColWidth;
        doc.rect(x, y, dayColWidth, dayHeight).stroke('#cbd5f1');
        doc.text(day.dayNumber, x + 4, y + 4, {
            width: dayColWidth - 8,
        });
    });
    doc.rect(totalX, y, totalColWidth, dayHeight).stroke('#cbd5f1');
    y += dayHeight;

    doc.font('Helvetica').fontSize(7).fillColor('#0f172a');

    rows.forEach((row) => {
        doc.rect(startX, y, nameColWidth, rowHeight).stroke('#cbd5f1');
        doc.font('Helvetica-Bold').text(row.name, startX + 4, y + 6, {
            width: nameColWidth - 8,
        });

        days.forEach((day, index) => {
            const x = startX + nameColWidth + index * dayColWidth;
            doc.rect(x, y, dayColWidth, rowHeight).stroke('#cbd5f1');
            const shiftText = row.shifts[day.dateKey] || '';
            doc
                .font('Helvetica')
                .text(shiftText, x + 2, y + 6, {
                    width: dayColWidth - 4,
                    align: 'center',
                });
        });

        doc
            .rect(totalX, y, totalColWidth, rowHeight)
            .stroke('#cbd5f1');
        doc
            .font('Helvetica')
            .text(row.totalHours || '', totalX + 2, y + 10, {
                width: totalColWidth - 4,
                align: 'center',
            });

        y += rowHeight;

        doc.rect(startX, y, nameColWidth, hoursRowHeight).stroke('#cbd5f1');
        doc.font('Helvetica').text('Horas', startX + 4, y + 4, {
            width: nameColWidth - 8,
        });

        days.forEach((day, index) => {
            const x = startX + nameColWidth + index * dayColWidth;
            doc.rect(x, y, dayColWidth, hoursRowHeight).stroke('#cbd5f1');
            const hoursText = row.hoursByDay[day.dateKey] || '-';
            doc
                .font('Helvetica')
                .text(hoursText, x + 2, y + 4, {
                    width: dayColWidth - 4,
                    align: 'center',
                });
        });

        doc
            .rect(totalX, y, totalColWidth, hoursRowHeight)
            .stroke('#cbd5f1');
        y += hoursRowHeight;

        if (y + rowHeight + hoursRowHeight > doc.page.height - 40) {
            doc.addPage({ layout: 'landscape' });
            y = doc.page.margins.top;
        }
    });
};

export const createScheduleGridPdfUtil = async ({ sections, fileName }) => {
    const baseDir = path.join(process.cwd(), UPLOADS_DIR, 'documents', 'schedules');
    await ensureDir(baseDir);

    const safeFileName = fileName || `schedule-${Date.now()}.pdf`;
    const filePath = path.join(baseDir, safeFileName);

    const doc = new PDFDocument({
        margin: 24,
        size: 'A4',
        layout: 'landscape',
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    sections.forEach((section, index) => {
        if (index > 0) {
            doc.addPage({ layout: 'landscape' });
        }

        const days = getMonthDays(section.month);
        const monthLabel = formatMonthLabel(section.month);

        drawHeader(doc, section.meta, monthLabel);
        drawGrid(doc, days, section.rows);
    });

    doc.end();

    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    return filePath;
};
