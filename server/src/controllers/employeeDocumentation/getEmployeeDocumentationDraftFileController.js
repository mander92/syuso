import fs from 'fs';

import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    allowedDocumentationFileFields,
    getEmployeeDocumentationFilePath,
} from '../../utils/employeeDocumentationFileUtil.js';

const getEmployeeDocumentationDraftFileController = async (req, res, next) => {
    try {
        const { draftId, field } = req.params;
        if (!allowedDocumentationFileFields.has(field)) {
            generateErrorUtil('Archivo no permitido', 400);
        }

        const draft = await selectEmployeeDocumentationDraftService(draftId);
        const relativePath = draft?.[field];
        if (!relativePath) generateErrorUtil('Archivo no encontrado', 404);

        const filePath = getEmployeeDocumentationFilePath(relativePath);
        if (!fs.existsSync(filePath)) {
            generateErrorUtil('Archivo no encontrado', 404);
        }

        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
};

export default getEmployeeDocumentationDraftFileController;

