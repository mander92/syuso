import Joi from 'joi';

import createInternalClientService from '../../services/clientDocumentation/createInternalClientService.js';
import selectClientDocumentationService from '../../services/clientDocumentation/selectClientDocumentationService.js';
import upsertClientDocumentationService from '../../services/clientDocumentation/upsertClientDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    allowedClientDocumentationFileFields,
    saveClientDocumentationFile,
} from '../../utils/clientDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const saveClientDocumentationController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            displayName: Joi.string().max(150).allow('', null),
            taxId: Joi.string().max(20).allow('', null),
            phone: Joi.string().max(30).allow('', null),
            email: Joi.string().email().max(150).allow('', null),
            contactPerson: Joi.string().max(150).allow('', null),
            authorizations: Joi.string().allow('', null),
            paymentMethod: Joi.string().max(100).allow('', null),
            status: Joi.string()
                .valid('pending', 'reviewed', 'rejected')
                .default('pending'),
            reviewNotes: Joi.string().max(500).allow('', null),
        });

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });

        if (error) generateErrorUtil(error.message, 400);

        const clientId =
            req.params.clientId ||
            (await createInternalClientService({
                displayName: value.displayName,
                taxId: value.taxId,
                phone: value.phone,
                email: value.email,
            }));

        const existing = await selectClientDocumentationService(clientId);
        if (!existing) generateErrorUtil('Cliente no encontrado', 404);

        const filesPayload = {};
        for (const field of allowedClientDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                filesPayload[field] = await saveClientDocumentationFile(
                    file,
                    clientId,
                    field
                );
            }
        }

        await upsertClientDocumentationService(clientId, {
            ...value,
            ...filesPayload,
        });

        const data = await selectClientDocumentationService(clientId);
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: clientId,
            subjectType: 'client',
            title: 'Documentacion de cliente',
            message: `${data.displayName || data.userEmail || 'Cliente'}: ficha documental actualizada`,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default saveClientDocumentationController;
