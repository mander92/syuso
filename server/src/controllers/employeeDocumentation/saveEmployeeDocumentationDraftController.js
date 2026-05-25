import Joi from 'joi';

import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import upsertEmployeeDocumentationDraftService from '../../services/employeeDocumentation/upsertEmployeeDocumentationDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
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
    status: Joi.string()
        .valid('draft', 'pending', 'reviewed', 'converted', 'rejected')
        .allow(null),
    reviewNotes: Joi.string().max(500).allow('', null),
});

const saveEmployeeDocumentationDraftController = async (req, res, next) => {
    try {
        const draftId = req.params.draftId || null;
        if (draftId) {
            const draft = await selectEmployeeDocumentationDraftService(draftId);
            if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        }

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertEmployeeDocumentationDraftService(draftId, value);

        const filesPayload = {};
        for (const field of allowedDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                filesPayload[field] = await saveEmployeeDocumentationFile(
                    file,
                    `drafts/${id}`,
                    field
                );
            }
        }

        if (Object.keys(filesPayload).length) {
            await upsertEmployeeDocumentationDraftService(id, filesPayload);
        }

        const data = await selectEmployeeDocumentationDraftService(id);
        const fullName =
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            data.email ||
            'Alta pendiente';
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: id,
            subjectType: 'employeeDraft',
            title: 'Alta documental',
            message: `${fullName}: alta pendiente actualizada`,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default saveEmployeeDocumentationDraftController;
