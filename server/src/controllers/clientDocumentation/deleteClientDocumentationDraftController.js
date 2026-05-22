import deleteClientDocumentationDraftService from '../../services/clientDocumentation/deleteClientDocumentationDraftService.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const deleteClientDocumentationDraftController = async (req, res, next) => {
    try {
        const { draftId } = req.params;

        await deleteClientDocumentationDraftService(draftId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: draftId,
            subjectType: 'clientDraft',
            title: 'Alta de cliente borrada',
            message: 'Se ha borrado una ficha de alta de cliente',
        });

        res.send({
            status: 'ok',
            message: 'Alta de cliente borrada',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteClientDocumentationDraftController;
