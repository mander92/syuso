import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectClientDocumentationDraftByTokenService from '../../services/clientDocumentation/selectClientDocumentationDraftByTokenService.js';

const getPublicClientDocumentationDraftController = async (req, res, next) => {
    try {
        const { token } = req.params;
        const draft = await selectClientDocumentationDraftByTokenService(token);
        if (!draft) generateErrorUtil('Enlace no valido o caducado', 404);
        if (draft.linkedClientId) {
            generateErrorUtil('Esta ficha ya ha sido procesada', 409);
        }

        res.send({ status: 'ok', data: draft });
    } catch (error) {
        next(error);
    }
};

export default getPublicClientDocumentationDraftController;
