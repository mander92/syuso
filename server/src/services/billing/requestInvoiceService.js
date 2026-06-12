import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import sendMail from '../../utils/sendBrevoMail.js';
import createBillingRequestExcelUtil from '../../utils/billingRequestExcelUtil.js';
import calculateBillingService from './calculateBillingService.js';
import {
    formatCurrency,
    formatDate,
    parseEmails,
    serializeEmails,
} from './billingUtils.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const requestInvoiceService = async ({
    serviceId,
    serviceIds,
    periodStart,
    periodEnd,
    emails,
    ccEmails,
    notes,
    concept,
    concepts = {},
    manualItems = [],
    vatPercent,
    requestedBy,
}) => {
    const recipients = parseEmails(emails);
    const ccRecipients = parseEmails(ccEmails);
    if (!recipients.length) {
        generateErrorUtil('Debes indicar al menos un correo destino', 400);
    }

    const selectedServiceIds =
        Array.isArray(serviceIds) && serviceIds.length
            ? serviceIds
            : [serviceId].filter(Boolean);
    const selectedManualItems = Array.isArray(manualItems) ? manualItems : [];

    if (!selectedServiceIds.length && !selectedManualItems.length) {
        generateErrorUtil('Debes seleccionar al menos un servicio o agregar una factura manual', 400);
    }

    const pool = await getPool();
    const records = [];
    const failed = [];

    for (const currentServiceId of selectedServiceIds) {
        const serviceConcept = concepts[currentServiceId] || concept || '';
        const billing = await calculateBillingService({
            serviceId: currentServiceId,
            periodStart,
            periodEnd,
            concept: serviceConcept,
            vatPercent,
        });

        await pool.query(
            `
            UPDATE services
            SET billingConcept = ?
            WHERE id = ?
            `,
            [billing.concept, currentServiceId]
        );

        const recordId = uuid();
        await pool.query(
            `
            INSERT INTO billingRecords (
                id,
                serviceId,
                clientId,
                concept,
                periodStart,
                periodEnd,
                totalHours,
                hourlyRate,
                subtotal,
                vatPercent,
                vatAmount,
                amount,
                requestEmails,
                requestCcEmails,
                requestNotes,
                requestedAt,
                requestedBy,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'requested')
            `,
            [
                recordId,
                currentServiceId,
                billing.service.clientId,
                billing.concept,
                periodStart,
                periodEnd,
                billing.totalHours,
                billing.hourlyRate,
                billing.subtotal,
                billing.vatPercent,
                billing.vatAmount,
                billing.amount,
                serializeEmails(recipients),
                serializeEmails(ccRecipients),
                notes || null,
                requestedBy,
            ]
        );

        records.push({
            id: recordId,
            ...billing,
        });
    }

    for (const item of selectedManualItems) {
        const itemVatPercent = Number.isFinite(Number(item.vatPercent))
            ? Number(item.vatPercent)
            : Number(vatPercent) || 21;
        const totalHours = Number(item.totalHours) || 0;
        const hourlyRate = Number(item.hourlyRate) || 0;
        const subtotal = Number((totalHours * hourlyRate).toFixed(2));
        const vatAmount = Number(((subtotal * itemVatPercent) / 100).toFixed(2));
        const amount = Number((subtotal + vatAmount).toFixed(2));
        const recordId = uuid();
        const manualService = {
            id: null,
            name: item.concept,
            province: item.delegation || 'Manual',
            clientId: null,
            clientName: item.clientName,
            clientEmail: item.contactEmail || '',
            clientDisplayName: item.clientName,
            clientTaxId: item.taxId || '',
            clientDocumentationEmail: item.contactEmail || '',
            clientAddress: item.address || '',
            clientCity: '',
            clientPostCode: '',
            clientProvince: item.delegation || '',
        };

        await pool.query(
            `
            INSERT INTO billingRecords (
                id,
                serviceId,
                clientId,
                manualClientName,
                manualTaxId,
                manualAddress,
                manualContactEmail,
                manualDelegation,
                concept,
                periodStart,
                periodEnd,
                totalHours,
                hourlyRate,
                subtotal,
                vatPercent,
                vatAmount,
                amount,
                requestEmails,
                requestCcEmails,
                requestNotes,
                requestedAt,
                requestedBy,
                status
            )
            VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'requested')
            `,
            [
                recordId,
                item.clientName,
                item.taxId || null,
                item.address || null,
                item.contactEmail || null,
                item.delegation || null,
                item.concept,
                periodStart,
                periodEnd,
                totalHours,
                hourlyRate,
                subtotal,
                itemVatPercent,
                vatAmount,
                amount,
                serializeEmails(recipients),
                serializeEmails(ccRecipients),
                notes || null,
                requestedBy,
            ]
        );

        records.push({
            id: recordId,
            service: manualService,
            concept: item.concept,
            periodStart,
            periodEnd,
            totalHours,
            hourlyRate,
            subtotal,
            vatPercent: itemVatPercent,
            vatAmount,
            amount,
        });
    }

    const excelFile = await createBillingRequestExcelUtil({
        records,
        periodStart,
        periodEnd,
    });

    const subject = `Solicitud de facturas - ${formatDate(periodStart)} a ${formatDate(periodEnd)}`;
    const totals = records.reduce(
        (acc, record) => ({
            totalHours: acc.totalHours + (Number(record.totalHours) || 0),
            subtotal: acc.subtotal + (Number(record.subtotal) || 0),
            vatAmount: acc.vatAmount + (Number(record.vatAmount) || 0),
            amount: acc.amount + (Number(record.amount) || 0),
        }),
        { totalHours: 0, subtotal: 0, vatAmount: 0, amount: 0 }
    );

    const rowsHtml = records
        .map(
            (record) => `
                <tr>
                    <td>${record.service.name}</td>
                    <td>${record.concept}</td>
                    <td>${record.totalHours.toFixed(2)} h</td>
                    <td>${formatCurrency(record.hourlyRate)}</td>
                    <td>${formatCurrency(record.amount)}</td>
                </tr>
            `
        )
        .join('');

    const body = `
        <h2>Solicitud de facturas</h2>
        <p>Periodo: <strong>${formatDate(periodStart)} - ${formatDate(periodEnd)}</strong></p>
        <p>Se adjunta Excel con el detalle de servicios a facturar.</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <thead>
                <tr>
                    <th>Servicio</th>
                    <th>Concepto</th>
                    <th>Horas</th>
                    <th>Precio/hora</th>
                    <th>Total estimado</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <p>
            <strong>Total bloque:</strong>
            ${totals.totalHours.toFixed(2)} h ·
            Base ${formatCurrency(totals.subtotal)} ·
            IVA ${formatCurrency(totals.vatAmount)} ·
            Total ${formatCurrency(totals.amount)}
        </p>
        ${notes ? `<p>Notas: ${notes}</p>` : ''}
    `;

    for (const email of recipients) {
        const sent = await sendMail(
            'Facturacion',
            email,
            subject,
            body,
            [{ filename: excelFile.fileName, path: excelFile.filePath }],
            { cc: ccRecipients }
        );
        if (!sent) failed.push(email);
    }

    return {
        records,
        requestedCount: records.length,
        failed,
        requestFilePath: excelFile.relativePath,
    };
};

export default requestInvoiceService;
