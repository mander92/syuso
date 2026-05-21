import fs from 'fs';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectClientDocumentationDraftService from '../../services/clientDocumentation/selectClientDocumentationDraftService.js';
import {
    allowedClientDocumentationFileFields,
    getClientDocumentationFilePath,
} from '../../utils/clientDocumentationFileUtil.js';

const getClientDocumentationDraftFileController = async (req, res, next) => {
    try {
        const { draftId, field } = req.params;
        if (!allowedClientDocumentationFileFields.has(field)) {
            generateErrorUtil('Campo de archivo no permitido', 400);
        }

        const draft = await selectClientDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);

        const relativePath = draft[field];
        if (!relativePath) generateErrorUtil('Archivo no encontrado', 404);

        const filePath = getClientDocumentationFilePath(relativePath);
        if (!fs.existsSync(filePath)) {
            generateErrorUtil('Archivo no encontrado', 404);
        }

        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
};

export default getClientDocumentationDraftFileController;
