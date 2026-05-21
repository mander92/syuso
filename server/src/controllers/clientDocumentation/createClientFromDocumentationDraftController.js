import generateErrorUtil from '../../utils/generateErrorUtil.js';
import createInternalClientService from '../../services/clientDocumentation/createInternalClientService.js';
import selectClientDocumentationDraftService from '../../services/clientDocumentation/selectClientDocumentationDraftService.js';
import upsertClientDocumentationDraftService from '../../services/clientDocumentation/upsertClientDocumentationDraftService.js';
import upsertClientDocumentationService from '../../services/clientDocumentation/upsertClientDocumentationService.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const createClientFromDocumentationDraftController = async (req, res, next) => {
    try {
        const { draftId } = req.params;
        const draft = await selectClientDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        if (draft.linkedClientId) {
            generateErrorUtil('Esta ficha ya esta vinculada a un cliente', 409);
        }

        const required = ['displayName', 'email'];
        const missing = required.filter((field) => !draft[field]);
        if (missing.length) {
            generateErrorUtil(
                `Faltan datos para crear el cliente: ${missing.join(', ')}`,
                400
            );
        }

        const clientId = await createInternalClientService({
            displayName: draft.displayName,
            taxId: draft.taxId,
            phone: draft.phone,
            email: draft.email,
        });

        await upsertClientDocumentationService(clientId, {
            displayName: draft.displayName,
            taxId: draft.taxId,
            phone: draft.phone,
            email: draft.email,
            contactPerson: draft.contactPerson,
            acceptedBudgetPath: draft.acceptedBudgetPath,
            serviceContractPath: draft.serviceContractPath,
            authorizations: draft.authorizations,
            paymentMethod: draft.paymentMethod,
            status: 'pending',
            reviewNotes: draft.reviewNotes,
        });

        await upsertClientDocumentationDraftService(draftId, {
            linkedClientId: clientId,
            status: 'converted',
        });

        const data = await selectClientDocumentationDraftService(draftId);
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: draftId,
            subjectType: 'clientDraft',
            title: 'Alta de cliente convertida',
            message: `${data.displayName || data.email || 'Cliente'}: ficha convertida en cliente interno`,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default createClientFromDocumentationDraftController;
