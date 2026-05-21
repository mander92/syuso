import { CLIENT_URL } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import createDocumentationDraftTokenService from '../../services/employeeDocumentation/createDocumentationDraftTokenService.js';
import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';

const createDocumentationDraftTokenController = async (req, res, next) => {
    try {
        const { draftId } = req.params;
        const draft = await selectEmployeeDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        if (draft.linkedUserId) {
            generateErrorUtil('La ficha ya esta convertida en trabajador', 409);
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const token = await createDocumentationDraftTokenService(
            draftId,
            expiresAt
        );

        res.send({
            status: 'ok',
            data: {
                token,
                expiresAt,
                url: `${CLIENT_URL}/documentacion-alta/${token}`,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default createDocumentationDraftTokenController;

