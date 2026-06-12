import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import PDFDocument from 'pdfkit';

import getPool from '../../db/getPool.js';
import { UPLOADS_DIR } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-ES');
};

const formatCurrency = (value) =>
    `${(Number(value) || 0).toFixed(2).replace('.', ',')} EUR`;

const ensureDir = async (dirPath) => {
    await fsPromises.mkdir(dirPath, { recursive: true });
};

const getLogoPath = () => {
    const candidates = [
        path.join(process.cwd(), '..', 'client', 'src', 'assets', 'syusoLogo.jpg'),
        path.join(process.cwd(), 'client', 'src', 'assets', 'syusoLogo.jpg'),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
};

const drawTextPair = (doc, label, value, x, y, width = 220) => {
    doc.font('Helvetica-Bold').fontSize(8).text(label, x, y, { width });
    doc.font('Helvetica').fontSize(9).text(value || '-', x, y + 11, { width });
};

const generateBillingInvoiceService = async ({
    billingRecordId,
    invoiceSeries = '1',
    invoiceDate,
}) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT
            br.*,
            s.name AS serviceName,
            s.province AS serviceDelegation,
            CONCAT_WS(' ', client.firstName, client.lastName) AS clientName,
            client.email AS clientEmail,
            cd.displayName AS clientDisplayName,
            cd.taxId AS clientTaxId,
            cd.email AS clientDocumentationEmail,
            cd.paymentMethod,
            a.address,
            a.city,
            a.postCode
        FROM billingRecords br
        INNER JOIN services s ON s.id = br.serviceId
        LEFT JOIN users client ON client.id = br.clientId
        LEFT JOIN clientDocumentations cd ON cd.clientId = client.id
        LEFT JOIN addresses a ON a.id = s.addressId
        WHERE br.id = ?
          AND br.deletedAt IS NULL
        `,
        [billingRecordId]
    );

    if (!rows.length) generateErrorUtil('Registro de facturacion no encontrado', 404);

    const record = rows[0];
    const series = String(invoiceSeries || record.invoiceSeries || '1').trim();
    let sequence = Number(record.invoiceSequence);

    if (!sequence || record.invoiceSeries !== series) {
        const [sequenceRows] = await pool.query(
            `
            SELECT COALESCE(MAX(invoiceSequence), 0) + 1 AS nextSequence
            FROM billingRecords
            WHERE invoiceSeries = ?
              AND deletedAt IS NULL
            `,
            [series]
        );
        sequence = Number(sequenceRows[0]?.nextSequence) || 1;
    }

    const invoiceNumber = `${series}-${String(sequence).padStart(6, '0')}`;
    const safeInvoiceNumber = invoiceNumber.replace(/[^\w-]/g, '_');
    const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
    const invoiceDir = path.join(uploadsRoot, 'billing', 'generated');
    await ensureDir(invoiceDir);

    const fileName = `Factura ${safeInvoiceNumber} ${record.clientDisplayName || record.clientName || record.serviceName}.pdf`
        .replace(/[<>:"/\\|?*]+/g, ' ')
        .trim();
    const diskPath = path.join(invoiceDir, fileName);
    const relativePath = `billing/generated/${fileName}`;
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const stream = fs.createWriteStream(diskPath);
    doc.pipe(stream);

    const logoPath = getLogoPath();
    if (logoPath) {
        doc.image(logoPath, 42, 34, { width: 58 });
    }

    doc.font('Helvetica-Bold').fontSize(22).text('Factura', 420, 44, {
        width: 120,
        align: 'right',
    });
    doc.font('Helvetica').fontSize(9).text('RNSP: 4.670', 420, 72, {
        width: 120,
        align: 'right',
    });

    doc.font('Helvetica-Bold').fontSize(10).text('SYUSO SEGURIDAD, S.L.', 42, 105);
    doc.font('Helvetica')
        .fontSize(9)
        .text('INNOVACION (Edif. Convencion, Pt. 2, Modulo 210) 6', 42, 120)
        .text('41020 SEVILLA', 42, 134)
        .text('B09817537', 42, 148);

    const invoiceDateValue = invoiceDate || new Date().toISOString().slice(0, 10);
    drawTextPair(doc, 'DOCUMENTO', 'Factura', 330, 105, 70);
    drawTextPair(doc, 'NUMERO', invoiceNumber, 405, 105, 80);
    drawTextPair(doc, 'FECHA', formatDate(invoiceDateValue), 490, 105, 70);

    const clientName =
        record.clientDisplayName || record.clientName || record.clientEmail || 'Cliente';
    const clientAddress = [record.address, record.postCode, record.city, record.serviceDelegation]
        .filter(Boolean)
        .join(', ');

    doc.roundedRect(42, 178, 510, 94, 6).stroke('#d8e0eb');
    drawTextPair(doc, 'N.I.F.', record.clientTaxId || '-', 60, 194, 110);
    drawTextPair(doc, 'CLIENTE', clientName, 180, 194, 330);
    drawTextPair(doc, 'DIRECCION', clientAddress || '-', 60, 230, 330);
    drawTextPair(doc, 'FORMA DE PAGO', record.paymentMethod || 'CONFIRMING 180 DIAS', 410, 230, 110);

    const subtotal =
        Number(record.subtotal) ||
        Number(((Number(record.totalHours) || 0) * (Number(record.hourlyRate) || 0)).toFixed(2));
    const vatPercent = Number(record.vatPercent) || 0;
    const vatAmount = Number(record.vatAmount) || Number(((subtotal * vatPercent) / 100).toFixed(2));
    const total = Number(record.amount) || Number((subtotal + vatAmount).toFixed(2));

    const tableTop = 315;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('CONCEPTO', 42, tableTop);
    doc.text('CANTIDAD/HORAS', 285, tableTop, { width: 90, align: 'right' });
    doc.text('PRECIO', 390, tableTop, { width: 70, align: 'right' });
    doc.text('TOTAL', 480, tableTop, { width: 70, align: 'right' });
    doc.moveTo(42, tableTop + 18).lineTo(552, tableTop + 18).stroke('#0f172a');

    doc.font('Helvetica').fontSize(9);
    doc.text(record.concept || record.serviceName, 42, tableTop + 35, { width: 230 });
    doc.text(Number(record.totalHours || 0).toFixed(2).replace('.', ','), 285, tableTop + 35, {
        width: 90,
        align: 'right',
    });
    doc.text(formatCurrency(record.hourlyRate), 390, tableTop + 35, {
        width: 70,
        align: 'right',
    });
    doc.text(formatCurrency(subtotal), 480, tableTop + 35, {
        width: 70,
        align: 'right',
    });

    doc.moveTo(42, 610).lineTo(552, 610).stroke('#d8e0eb');
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('BASE', 360, 630, { width: 70, align: 'right' });
    doc.text(`I.V.A. (${vatPercent.toFixed(2).replace('.', ',')}%)`, 430, 630, {
        width: 80,
        align: 'right',
    });
    doc.text('TOTAL:', 500, 630, { width: 52, align: 'right' });
    doc.font('Helvetica').fontSize(10);
    doc.text(formatCurrency(subtotal), 360, 650, { width: 70, align: 'right' });
    doc.text(formatCurrency(vatAmount), 430, 650, { width: 80, align: 'right' });
    doc.font('Helvetica-Bold').text(formatCurrency(total), 500, 650, {
        width: 52,
        align: 'right',
    });

    doc.font('Helvetica').fontSize(6.5).fillColor('#475569');
    doc.text(
        'Le informamos que sus datos personales, en aplicacion del Reglamento General de Proteccion de Datos de ambito europeo 679/2016, objeto de esta comunicacion, formaran parte del sistema de tratamientos de datos de SYUSO SEGURIDAD, S.L. con CIF B09817537 y direccion a efectos de notificaciones en Av. Innovacion, 6 (Edif. Convencion, plt. 2, modulo 210), c.p.: 41020 - Sevilla o via e-mail a gerencia@syuso.es, para la realizacion de las gestiones administrativas o contables necesarias.',
        42,
        705,
        { width: 510, align: 'justify' }
    );
    doc.text(
        'Inscrita en el Registro Mercantil de Sevilla, Tomo 7184, folio 220, Hoja SE-133727, y CIF B-09817537. ESTA FACTURA ESTA SUJETA AL REGIMEN ESPECIAL DEL CRITERIO DE CAJA.',
        42,
        770,
        { width: 510, align: 'justify' }
    );

    doc.end();
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    await pool.query(
        `
        UPDATE billingRecords
        SET invoiceSeries = ?,
            invoiceSequence = ?,
            invoiceNumber = ?,
            invoiceGeneratedAt = CURRENT_TIMESTAMP,
            invoiceFilePath = ?,
            invoiceFileName = ?,
            status = IF(status = 'sent', status, 'invoice_received')
        WHERE id = ?
        `,
        [
            series,
            sequence,
            invoiceNumber,
            relativePath,
            fileName,
            billingRecordId,
        ]
    );

    return {
        id: billingRecordId,
        invoiceSeries: series,
        invoiceSequence: sequence,
        invoiceNumber,
        invoiceFilePath: relativePath,
        invoiceFileName: fileName,
    };
};

export default generateBillingInvoiceService;
