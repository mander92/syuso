import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import listEmployeeSignatureDocumentsService from '../../services/employeeDocumentation/listEmployeeSignatureDocumentsService.js';
import {
    buildEmployeeLifecycleAttachments,
    sendEmployeeLifecycleEmail,
} from '../../utils/employeeLifecycleEmailUtil.js';

const parseEmails = (raw) =>
    String(raw || '')
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

const schema = Joi.object({
    action: Joi.string().valid('hire', 'termination').required(),
    emails: Joi.string().max(1000).required(),
    ccEmails: Joi.string().max(1000).allow('', null),
    employmentPercentage: Joi.string().max(50).allow('', null),
    contractType: Joi.string().max(120).allow('', null),
    startDate: Joi.date().allow('', null),
    workCenter: Joi.string().max(150).allow('', null),
    terminationDate: Joi.date().allow('', null),
    terminationReason: Joi.string().max(100).allow('', null),
});

const sendEmployeeLifecycleEmailController = async (req, res, next) => {
    try {
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

        const { userId } = req.params;
        const documentation = await selectEmployeeDocumentationService(userId);
        if (!documentation) generateErrorUtil('Trabajador no encontrado', 404);

        const signatureDocuments = await listEmployeeSignatureDocumentsService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: userId,
        });
        const attachments = buildEmployeeLifecycleAttachments({
            documentation,
            signatureDocuments,
        });

        const { failed } = await sendEmployeeLifecycleEmail({
            emails: recipients.join(','),
            ccEmails: ccRecipients.join(','),
            employee: documentation,
            action: value.action === 'termination' ? 'termination' : 'hire',
            employmentData: value,
            terminationData: value,
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

export default sendEmployeeLifecycleEmailController;
