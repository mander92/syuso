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

const sendDocumentationDraftLinkController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            emails: Joi.string().max(1000).required(),
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
        const subject = 'Ficha de alta SYUSO';
        const body = `
            <p>Hola,</p>
            <p>Te enviamos el enlace privado para completar la ficha de alta de <strong>${employeeName}</strong> en SYUSO.</p>
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
