import { CLIENT_URL } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import createClientDocumentationDraftTokenService from '../../services/clientDocumentation/createClientDocumentationDraftTokenService.js';
import selectClientDocumentationDraftService from '../../services/clientDocumentation/selectClientDocumentationDraftService.js';

const createClientDocumentationDraftTokenController = async (req, res, next) => {
    try {
        const { draftId } = req.params;
        const draft = await selectClientDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        if (draft.linkedClientId) {
            generateErrorUtil('La ficha ya esta convertida en cliente', 409);
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const token = await createClientDocumentationDraftTokenService(
            draftId,
            expiresAt
        );

        res.send({
            status: 'ok',
            data: {
                token,
                expiresAt,
                url: `${CLIENT_URL}/documentacion-cliente/${token}`,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default createClientDocumentationDraftTokenController;
