import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import sendMail from '../../utils/sendBrevoMail.js';
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

    if (!selectedServiceIds.length) {
        generateErrorUtil('Debes seleccionar al menos un servicio', 400);
    }

    const pool = await getPool();
    const records = [];
    const failed = [];

    for (const currentServiceId of selectedServiceIds) {
        const billing = await calculateBillingService({
            serviceId: currentServiceId,
            periodStart,
            periodEnd,
            concept,
            vatPercent,
        });

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

        const subject = `Solicitud de factura - ${billing.service.name}`;
        const body = `
            <h2>Solicitud de factura</h2>
            <p>Servicio: <strong>${billing.service.name}</strong></p>
            <p>Concepto: <strong>${billing.concept}</strong></p>
            <p>Periodo: <strong>${formatDate(periodStart)} - ${formatDate(periodEnd)}</strong></p>
            <p>Horas facturables: <strong>${billing.totalHours.toFixed(2)} h</strong></p>
            <p>Precio/hora: <strong>${formatCurrency(billing.hourlyRate)}</strong></p>
            <p>Base imponible: <strong>${formatCurrency(billing.subtotal)}</strong></p>
            <p>IVA: <strong>${billing.vatPercent.toFixed(2)}% (${formatCurrency(billing.vatAmount)})</strong></p>
            <p>Total estimado: <strong>${formatCurrency(billing.amount)}</strong></p>
            ${notes ? `<p>Notas: ${notes}</p>` : ''}
        `;

        for (const email of recipients) {
            const sent = await sendMail('Facturacion', email, subject, body, [], {
                cc: ccRecipients,
            });
            if (!sent) failed.push(`${billing.service.name}: ${email}`);
        }

        records.push({
            id: recordId,
            ...billing,
        });
    }

    return {
        records,
        requestedCount: records.length,
        failed,
    };
};

export default requestInvoiceService;
