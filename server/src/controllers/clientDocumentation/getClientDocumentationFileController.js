import fs from 'fs';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectClientDocumentationService from '../../services/clientDocumentation/selectClientDocumentationService.js';
import {
    allowedClientDocumentationFileFields,
    getClientDocumentationFilePath,
} from '../../utils/clientDocumentationFileUtil.js';

const getClientDocumentationFileController = async (req, res, next) => {
    try {
        const { clientId, field } = req.params;
        if (!allowedClientDocumentationFileFields.has(field)) {
            generateErrorUtil('Campo de archivo no permitido', 400);
        }

        const documentation = await selectClientDocumentationService(clientId);
        if (!documentation) generateErrorUtil('Cliente no encontrado', 404);

        const relativePath = documentation[field];
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

export default getClientDocumentationFileController;
