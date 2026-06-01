import Joi from 'joi';

import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    buildEmployeeLifecycleAttachments,
    sendEmployeeLifecycleEmail,
} from '../../utils/employeeLifecycleEmailUtil.js';

const parseEmails = (raw) =>
    String(raw || '')
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

const sendDocumentationDraftLinkController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            emails: Joi.string().max(1000).required(),
            ccEmails: Joi.string().max(1000).allow('', null),
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
        const ccRecipients = [...new Set(parseEmails(value.ccEmails))];
        const invalidEmail = [...recipients, ...ccRecipients].find(
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

        const attachments = buildEmployeeLifecycleAttachments({
            documentation: draft,
            signatureDocuments: [],
        });

        const { failed } = await sendEmployeeLifecycleEmail({
            emails: recipients.join(','),
            ccEmails: ccRecipients.join(','),
            employee: draft,
            action: 'hire',
            employmentData: value,
            attachments,
        });

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
                cc: ccRecipients,
                attachments: attachments.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default sendDocumentationDraftLinkController;
