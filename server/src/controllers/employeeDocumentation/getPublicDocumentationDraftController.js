import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectDocumentationDraftByTokenService from '../../services/employeeDocumentation/selectDocumentationDraftByTokenService.js';

const getPublicDocumentationDraftController = async (req, res, next) => {
    try {
        const { token } = req.params;
        const draft = await selectDocumentationDraftByTokenService(token);
        if (!draft) generateErrorUtil('Enlace no valido o caducado', 404);
        if (draft.linkedUserId) {
            generateErrorUtil('Esta ficha ya ha sido procesada', 409);
        }

        res.send({ status: 'ok', data: draft });
    } catch (error) {
        next(error);
    }
};

export default getPublicDocumentationDraftController;

