import fs from 'fs';
import path from 'path';

import { getEmployeeDocumentationFilePath } from './employeeDocumentationFileUtil.js';
import sendMail from './sendBrevoMail.js';

const documentationFileLabels = {
    dniFrontPath: 'DNI anverso',
    dniBackPath: 'DNI reverso',
    tipFrontPath: 'TIP anverso',
    tipBackPath: 'TIP reverso',
};

const signatureDocumentTypeLabels = {
    epi: 'EPIS',
    information: 'Informacion',
    dataProtection: 'Proteccion de datos',
    contract: 'Contrato',
    medical: 'Reconocimiento medico',
    riskAssessment: 'Evaluacion de riesgos',
    tax: 'Modelo 145',
    other: 'Otro',
};

const terminationReasonLabels = {
    voluntary: 'Baja voluntaria',
    end_call: 'Fin de llamamiento',
    contract_end: 'Fin de contrato',
    dismissal: 'Despido',
    other: 'Otro',
};

const parseEmails = (raw) =>
    String(raw || '')
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

const escapeHtml = (value) =>
    String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-ES');
};

const renderDetailsList = (items) =>
    items
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(
            ([label, value]) =>
                `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`
        )
        .join('');

const getMailErrorMessage = (error) => {
    const body = error?.response?.body;
    if (body?.message) return body.message;
    if (body?.code) return body.code;
    if (error?.message) return error.message;
    return 'error desconocido';
};

const addAttachmentIfExists = (attachments, relativePath, filename) => {
    if (!relativePath) return;
    const filePath = getEmployeeDocumentationFilePath(relativePath);
    if (!fs.existsSync(filePath)) return;

    attachments.push({
        path: filePath,
        filename: filename || path.basename(filePath),
    });
};

export const buildEmployeeLifecycleAttachments = ({
    documentation,
    signatureDocuments = [],
}) => {
    const attachments = [];
    Object.entries(documentationFileLabels).forEach(([field, label]) => {
        const extension = path.extname(documentation?.[field] || '');
        addAttachmentIfExists(
            attachments,
            documentation?.[field],
            `${label}${extension}`
        );
    });

    signatureDocuments.forEach((document) => {
        const typeLabel =
            signatureDocumentTypeLabels[document.documentType] || 'Documento';
        const originalExtension = path.extname(document.originalFilePath || '');
        const signedExtension = path.extname(document.signaturePath || '');
        addAttachmentIfExists(
            attachments,
            document.originalFilePath,
            document.originalFileName || `${typeLabel}${originalExtension}`
        );
        addAttachmentIfExists(
            attachments,
            document.signaturePath,
            document.signedFileName || `${typeLabel} firmado${signedExtension}`
        );
    });

    return attachments;
};

export const sendEmployeeLifecycleEmail = async ({
    emails,
    ccEmails = '',
    employee,
    action,
    employmentData = {},
    terminationData = {},
    attachments = [],
}) => {
    const recipients = [...new Set(parseEmails(emails))];
    const ccRecipients = [...new Set(parseEmails(ccEmails))].filter(
        (email) => !recipients.includes(email)
    );
    const employeeName =
        `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
        employee?.email ||
        'Trabajador';
    const details =
        action === 'termination'
            ? [
                  ['Fecha de baja', formatDate(terminationData.terminationDate)],
                  [
                      'Motivo de baja',
                      terminationReasonLabels[
                          terminationData.terminationReason
                      ] || terminationData.terminationReason,
                  ],
              ]
            : [
                  ['Porcentaje de alta', employmentData.employmentPercentage],
                  ['Tipo de contrato', employmentData.contractType],
                  ['Fecha de alta', formatDate(employmentData.startDate)],
                  ['Centro de trabajo', employmentData.workCenter],
              ];
    const employeeDetails = [
        ['Nombre', employee?.firstName],
        ['Apellidos', employee?.lastName],
        ['Email', employee?.email],
        ['DNI', employee?.dni],
        ['TIP', employee?.tip],
        ['Fecha de nacimiento', formatDate(employee?.birthDate)],
        ['Telefono', employee?.phone || employee?.userPhone],
        ['Direccion', employee?.address],
        ['Numero de cuenta bancaria', employee?.bankAccount],
        ['Numero Seguridad Social', employee?.socialSecurityNumber],
    ];

    const subject =
        action === 'termination'
            ? `Baja de trabajador - ${employeeName}`
            : `Alta de trabajador - ${employeeName}`;
    const body = `
        <p>Hola,</p>
        <p>Se comunica la ${
            action === 'termination' ? 'baja' : 'alta'
        } de <strong>${escapeHtml(employeeName)}</strong>.</p>
        <p><strong>Datos del trabajador:</strong></p>
        <ul>
            ${renderDetailsList(employeeDetails)}
        </ul>
        <p><strong>Datos de la ${action === 'termination' ? 'baja' : 'alta'}:</strong></p>
        <ul>
            ${renderDetailsList(details)}
        </ul>
        <p>Se adjunta la documentacion disponible en la ficha del trabajador.</p>
    `;

    const failed = [];
    const failedDetails = [];
    for (const email of recipients) {
        try {
            await sendMail(employeeName, email, subject, body, attachments, {
                cc: ccRecipients,
                throwOnError: true,
            });
        } catch (error) {
            failed.push(email);
            failedDetails.push({
                email,
                reason: getMailErrorMessage(error),
            });
        }
    }

    return { recipients, ccRecipients, failed, failedDetails };
};
