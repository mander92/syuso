import generateErrorUtil from '../../utils/generateErrorUtil.js';
import getPool from '../../db/getPool.js';
import createInternalClientService from '../../services/clientDocumentation/createInternalClientService.js';
import selectClientDocumentationDraftService from '../../services/clientDocumentation/selectClientDocumentationDraftService.js';
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

        const displayName =
            draft.displayName ||
            draft.contactPerson ||
            draft.taxId ||
            'Cliente interno';

        const clientId = await createInternalClientService({
            displayName,
            taxId: draft.taxId,
            phone: draft.phone,
            email: draft.email,
        });

        await upsertClientDocumentationService(clientId, {
            displayName,
            taxId: draft.taxId,
            phone: draft.phone,
            email: draft.email || null,
            contactPerson: draft.contactPerson,
            acceptedBudgetPath: draft.acceptedBudgetPath,
            serviceContractPath: draft.serviceContractPath,
            authorizations: draft.authorizations,
            paymentMethod: draft.paymentMethod,
            status: 'pending',
            reviewNotes: draft.reviewNotes,
        });

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: draftId,
            subjectType: 'clientDraft',
            title: 'Alta de cliente convertida',
            message: `${displayName}: ficha convertida en cliente interno`,
        });

        const pool = await getPool();
        await pool.query(
            'DELETE FROM clientDocumentationDraftTokens WHERE draftId = ?',
            [draftId]
        );
        await pool.query('DELETE FROM clientDocumentationDrafts WHERE id = ?', [
            draftId,
        ]);

        res.send({
            status: 'ok',
            data: { deleted: true, linkedClientId: clientId },
        });
    } catch (error) {
        next(error);
    }
};

export default createClientFromDocumentationDraftController;
