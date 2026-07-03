import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectClientDocumentationDraftByTokenService from '../../services/clientDocumentation/selectClientDocumentationDraftByTokenService.js';
import upsertClientDocumentationDraftService from '../../services/clientDocumentation/upsertClientDocumentationDraftService.js';
import markClientDocumentationDraftTokenUsedService from '../../services/clientDocumentation/markClientDocumentationDraftTokenUsedService.js';
import {
    allowedClientDocumentationFileFields,
    saveClientDocumentationFile,
} from '../../utils/clientDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const schema = Joi.object({
    displayName: Joi.string().max(150).allow('', null),
    taxId: Joi.string().trim().max(20).required(),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email().allow('', null),
    contactPerson: Joi.string().max(150).allow('', null),
    authorizations: Joi.string().allow('', null),
    paymentMethod: Joi.string().max(100).allow('', null),
});

const savePublicClientDocumentationDraftController = async (req, res, next) => {
    try {
        const { token } = req.params;
        const draft = await selectClientDocumentationDraftByTokenService(token);
        if (!draft) generateErrorUtil('Enlace no valido o caducado', 404);
        if (draft.linkedClientId) {
            generateErrorUtil('Esta ficha ya ha sido procesada', 409);
        }

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const filesPayload = {};
        for (const field of allowedClientDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                filesPayload[field] = await saveClientDocumentationFile(
                    file,
                    `drafts/${draft.id}`,
                    field
                );
            }
        }

        await upsertClientDocumentationDraftService(draft.id, {
            ...value,
            ...filesPayload,
            status: 'pending',
        });
        await markClientDocumentationDraftTokenUsedService(token);

        const updated = await selectClientDocumentationDraftByTokenService(token);
        emitDocumentationChanged({
            subjectId: updated.id,
            subjectType: 'clientDraft',
            title: 'Ficha de cliente recibida',
            message: `${updated.displayName || updated.email || 'Cliente'}: ha enviado su ficha documental`,
        });
        res.send({ status: 'ok', data: updated });
    } catch (error) {
        next(error);
    }
};

export default savePublicClientDocumentationDraftController;
