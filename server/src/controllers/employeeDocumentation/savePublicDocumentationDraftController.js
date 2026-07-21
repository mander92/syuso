import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectDocumentationDraftByTokenService from '../../services/employeeDocumentation/selectDocumentationDraftByTokenService.js';
import upsertEmployeeDocumentationDraftService from '../../services/employeeDocumentation/upsertEmployeeDocumentationDraftService.js';
import markDocumentationDraftTokenUsedService from '../../services/employeeDocumentation/markDocumentationDraftTokenUsedService.js';
import {
    allowedDocumentationFileFields,
    saveEmployeeDocumentationFile,
} from '../../utils/employeeDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const schema = Joi.object({
    firstName: Joi.string().max(25).allow('', null),
    lastName: Joi.string().max(50).allow('', null),
    email: Joi.string().email().allow('', null),
    dni: Joi.string().max(20).allow('', null),
    tip: Joi.string().max(30).allow('', null),
    birthDate: Joi.date().allow('', null),
    bankAccount: Joi.string().max(40).allow('', null),
    address: Joi.string().max(255).allow('', null),
    phone: Joi.string().max(20).allow('', null),
    socialSecurityNumber: Joi.string().max(40).allow('', null),
    poloSize: Joi.string()
        .valid('XXXL', 'XXL', 'XL', 'L', 'M', 'S')
        .allow('', null),
    pantsSize: Joi.string()
        .valid('XXXL', 'XXL', 'XL', 'L', 'M', 'S')
        .allow('', null),
});

const savePublicDocumentationDraftController = async (req, res, next) => {
    try {
        const { token } = req.params;
        const draft = await selectDocumentationDraftByTokenService(token);
        if (!draft) generateErrorUtil('Enlace no valido o caducado', 404);
        if (draft.linkedUserId) {
            generateErrorUtil('Esta ficha ya ha sido procesada', 409);
        }

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const filesPayload = {};
        for (const field of allowedDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                filesPayload[field] = await saveEmployeeDocumentationFile(
                    file,
                    `drafts/${draft.id}`,
                    field
                );
            }
        }

        await upsertEmployeeDocumentationDraftService(draft.id, {
            ...value,
            ...filesPayload,
            status: 'pending',
        });
        await markDocumentationDraftTokenUsedService(token);

        const updated = await selectDocumentationDraftByTokenService(token);
        const fullName =
            `${updated.firstName || ''} ${updated.lastName || ''}`.trim() ||
            updated.email ||
            'Alta pendiente';
        emitDocumentationChanged({
            subjectId: updated.id,
            subjectType: 'employeeDraft',
            title: 'Ficha recibida',
            message: `${fullName}: ha enviado su ficha documental`,
        });
        res.send({ status: 'ok', data: updated });
    } catch (error) {
        next(error);
    }
};

export default savePublicDocumentationDraftController;
