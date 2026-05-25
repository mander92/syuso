import Joi from 'joi';

import { CLIENT_URL } from '../../../env.js';
import createDocumentationDraftTokenService from '../../services/employeeDocumentation/createDocumentationDraftTokenService.js';
import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import sendMail from '../../utils/sendBrevoMail.js';

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

const sendDocumentationDraftLinkController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            emails: Joi.string().max(1000).required(),
            employmentPercentage: Joi.string().max(50).allow('', null),
            contractType: Joi.string().max(120).allow('', null),
            startDate: Joi.date().allow('', null),
            workCenter: Joi.string().max(150).allow('', null),
        });

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const recipients = [...new Set(parseEmails(value.emails))];
        if (!recipients.length) {
            generateErrorUtil('Indica al menos un correo', 400);
        }

        const emailSchema = Joi.string().email();
        const invalidEmail = recipients.find(
            (email) => emailSchema.validate(email).error
        );
        if (invalidEmail) {
            generateErrorUtil(`Correo no valido: ${invalidEmail}`, 400);
        }

        const { draftId } = req.params;
        const draft = await selectEmployeeDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        if (draft.linkedUserId) {
            generateErrorUtil('La ficha ya esta convertida en trabajador', 409);
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const token = await createDocumentationDraftTokenService(
            draftId,
            expiresAt
        );
        const url = `${CLIENT_URL}/documentacion-alta/${token}`;
        const employeeName =
            `${draft.firstName || ''} ${draft.lastName || ''}`.trim() ||
            'trabajador/a';
        const employmentDetails = [
            ['Porcentaje de alta', value.employmentPercentage],
            ['Tipo de contrato', value.contractType],
            [
                'Fecha de alta',
                value.startDate
                    ? new Date(value.startDate).toLocaleDateString('es-ES')
                    : '',
            ],
            ['Centro de trabajo', value.workCenter],
        ].filter(([, detail]) => detail);
        const subject = 'Ficha de alta SYUSO';
        const body = `
            <p>Hola,</p>
            <p>Te enviamos el enlace privado para completar la ficha de alta de <strong>${employeeName}</strong> en SYUSO.</p>
            ${
                employmentDetails.length
                    ? `<p><strong>Datos previstos del alta:</strong></p>
                       <ul>
                           ${employmentDetails
                               .map(
                                   ([label, detail]) =>
                                       `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(detail)}</li>`
                               )
                               .join('')}
                       </ul>`
                    : ''
            }
            <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;">Completar ficha de alta</a></p>
            <p>El enlace caduca en 7 dias.</p>
        `;

        const failed = [];
        for (const email of recipients) {
            const sent = await sendMail(employeeName, email, subject, body);
            if (!sent) failed.push(email);
        }

        if (failed.length) {
            generateErrorUtil(
                `No se pudo enviar a: ${failed.join(', ')}`,
                500
            );
        }

        res.send({
            status: 'ok',
            data: {
                sentTo: recipients,
                token,
                expiresAt,
                url,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default sendDocumentationDraftLinkController;
