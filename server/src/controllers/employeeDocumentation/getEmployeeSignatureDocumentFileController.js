import fs from 'fs';

import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getEmployeeDocumentationFilePath } from '../../utils/employeeDocumentationFileUtil.js';

const getEmployeeSignatureDocumentFileController = async (req, res, next) => {
    try {
        const { documentId, fileType } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';
        if (!isAdmin && document.employeeId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        const relativePath =
            fileType === 'signature'
                ? document.signaturePath
                : document.originalFilePath;
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

export default getEmployeeSignatureDocumentFileController;
