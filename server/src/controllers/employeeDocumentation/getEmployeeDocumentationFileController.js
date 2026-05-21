import fs from 'fs';

import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    allowedDocumentationFileFields,
    getEmployeeDocumentationFilePath,
} from '../../utils/employeeDocumentationFileUtil.js';

const getEmployeeDocumentationFileController = async (req, res, next) => {
    try {
        const { userId, field } = req.params;
        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';

        if (!isAdmin && userId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        if (!allowedDocumentationFileFields.has(field)) {
            generateErrorUtil('Archivo no permitido', 400);
        }

        const documentation = await selectEmployeeDocumentationService(userId);
        const relativePath = documentation?.[field];
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

export default getEmployeeDocumentationFileController;

