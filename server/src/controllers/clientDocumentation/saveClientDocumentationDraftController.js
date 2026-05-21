import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectClientDocumentationDraftService from '../../services/clientDocumentation/selectClientDocumentationDraftService.js';
import upsertClientDocumentationDraftService from '../../services/clientDocumentation/upsertClientDocumentationDraftService.js';
import {
    allowedClientDocumentationFileFields,
    saveClientDocumentationFile,
} from '../../utils/clientDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const schema = Joi.object({
    displayName: Joi.string().max(150).allow('', null),
    taxId: Joi.string().max(20).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email().allow('', null),
    contactPerson: Joi.string().max(150).allow('', null),
    authorizations: Joi.string().allow('', null),
    paymentMethod: Joi.string().max(100).allow('', null),
    status: Joi.string()
        .valid('draft', 'pending', 'reviewed', 'converted', 'rejected')
        .allow(null),
    reviewNotes: Joi.string().max(500).allow('', null),
});

const saveClientDocumentationDraftController = async (req, res, next) => {
    try {
        const draftId = req.params.draftId || null;
        if (draftId) {
            const draft = await selectClientDocumentationDraftService(draftId);
            if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        }

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertClientDocumentationDraftService(draftId, value);

        const filesPayload = {};
        for (const field of allowedClientDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                filesPayload[field] = await saveClientDocumentationFile(
                    file,
                    `drafts/${id}`,
                    field
                );
            }
        }

        if (Object.keys(filesPayload).length) {
            await upsertClientDocumentationDraftService(id, filesPayload);
        }

        const data = await selectClientDocumentationDraftService(id);
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: id,
            subjectType: 'clientDraft',
            title: 'Alta documental de cliente',
            message: `${data.displayName || data.email || 'Cliente'}: alta pendiente actualizada`,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default saveClientDocumentationDraftController;
