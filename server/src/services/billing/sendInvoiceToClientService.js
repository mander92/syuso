import fsPromises from 'fs/promises';
import path from 'path';

import getPool from '../../db/getPool.js';
import { UPLOADS_DIR } from '../../../env.js';
import sendMail from '../../utils/sendBrevoMail.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    formatCurrency,
    formatDate,
    parseEmails,
    serializeEmails,
} from './billingUtils.js';

const ensureDir = async (dirPath) => {
    try {
        await fsPromises.access(dirPath);
    } catch {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
};

const saveInvoiceFile = async (recordId, file) => {
    if (!file) return {};

    const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
    const invoiceDir = path.join(uploadsRoot, 'billing', 'invoices');
    await ensureDir(invoiceDir);

    const extension = path.extname(file.name || '').toLowerCase() || '.pdf';
    const safeName = `${recordId}${extension}`;
    const diskPath = path.join(invoiceDir, safeName);

    if (file.tempFilePath) {
        await fsPromises.copyFile(file.tempFilePath, diskPath);
    } else if (file.data) {
        await fsPromises.writeFile(diskPath, file.data);
    }

    return {
        invoiceFilePath: `billing/invoices/${safeName}`,
        invoiceFileName: file.name || safeName,
    };
};

const sendInvoiceToClientService = async ({
    billingRecordId,
    emails,
    ccEmails,
    message,
    invoiceFile,
    sentBy,
}) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT
            br.*,
            COALESCE(s.name, br.concept, br.manualClientName) AS serviceName,
            COALESCE(br.manualClientName, CONCAT_WS(' ', client.firstName, client.lastName)) AS clientName,
            COALESCE(br.manualContactEmail, client.email) AS clientEmail
        FROM billingRecords br
        LEFT JOIN services s ON s.id = br.serviceId
        LEFT JOIN users client ON client.id = br.clientId
        WHERE br.id = ?
          AND br.deletedAt IS NULL
        `,
        [billingRecordId]
    );

    if (!rows.length) generateErrorUtil('Registro de facturacion no encontrado', 404);

    const record = rows[0];
    const recipients = parseEmails(emails || record.clientEmail);
    const ccRecipients = parseEmails(ccEmails);
    if (!recipients.length) {
        generateErrorUtil('Debes indicar al menos un correo del cliente', 400);
    }

    const savedFile = await saveInvoiceFile(billingRecordId, invoiceFile);
    const invoicePath = savedFile.invoiceFilePath || record.invoiceFilePath;
    const invoiceName = savedFile.invoiceFileName || record.invoiceFileName;

    if (!invoicePath) {
        generateErrorUtil('Debes adjuntar una factura', 400);
    }

    const fullInvoicePath = path.join(process.cwd(), UPLOADS_DIR, invoicePath);
    const subject = `Factura ${record.serviceName}`;
    const body = `
        <h2>Factura disponible</h2>
        <p>Servicio: <strong>${record.serviceName}</strong></p>
        <p>Concepto: <strong>${record.concept || record.serviceName}</strong></p>
        <p>Periodo: <strong>${formatDate(record.periodStart)} - ${formatDate(record.periodEnd)}</strong></p>
        <p>Horas facturadas: <strong>${Number(record.totalHours || 0).toFixed(2)} h</strong></p>
        <p>Base imponible: <strong>${formatCurrency(record.subtotal)}</strong></p>
        <p>IVA: <strong>${Number(record.vatPercent || 0).toFixed(2)}% (${formatCurrency(record.vatAmount)})</strong></p>
        <p>Total: <strong>${formatCurrency(record.amount)}</strong></p>
        ${message ? `<p>${message}</p>` : ''}
    `;

    const failed = [];
    for (const email of recipients) {
        const sent = await sendMail(
            record.clientName || 'Cliente',
            email,
            subject,
            body,
            [{ filename: invoiceName || 'factura.pdf', path: fullInvoicePath }],
            { cc: ccRecipients }
        );
        if (!sent) failed.push(email);
    }

    await pool.query(
        `
        UPDATE billingRecords
        SET invoiceFilePath = ?,
            invoiceFileName = ?,
            clientEmails = ?,
            clientCcEmails = ?,
            sentAt = CURRENT_TIMESTAMP,
            sentBy = ?,
            status = 'sent'
        WHERE id = ?
        `,
        [
            invoicePath,
            invoiceName,
            serializeEmails(recipients),
            serializeEmails(ccRecipients),
            sentBy,
            billingRecordId,
        ]
    );

    return { id: billingRecordId, failed };
};

export default sendInvoiceToClientService;
