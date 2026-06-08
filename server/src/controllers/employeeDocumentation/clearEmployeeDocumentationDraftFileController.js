import clearEmployeeDocumentationDraftFileService from '../../services/employeeDocumentation/clearEmployeeDocumentationDraftFileService.js';
import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { allowedDocumentationFileFields } from '../../utils/employeeDocumentationFileUtil.js';

const clearEmployeeDocumentationDraftFileController = async (req, res, next) => {
    try {
        const { draftId, field } = req.params;

        if (!allowedDocumentationFileFields.has(field)) {
            generateErrorUtil('Archivo no permitido', 400);
        }

        const draft = await selectEmployeeDocumentationDraftService(draftId);
        if (!draft) {
            generateErrorUtil('Ficha pendiente no encontrada', 404);
        }

        await clearEmployeeDocumentationDraftFileService(draftId, field);
        const data = await selectEmployeeDocumentationDraftService(draftId);

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default clearEmployeeDocumentationDraftFileController;
