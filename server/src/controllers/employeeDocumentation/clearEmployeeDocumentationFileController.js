import clearEmployeeDocumentationFileService from '../../services/employeeDocumentation/clearEmployeeDocumentationFileService.js';
import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { allowedDocumentationFileFields } from '../../utils/employeeDocumentationFileUtil.js';

const clearEmployeeDocumentationFileController = async (req, res, next) => {
    try {
        const { userId, field } = req.params;

        if (!allowedDocumentationFileFields.has(field)) {
            generateErrorUtil('Archivo no permitido', 400);
        }

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: userId,
        });

        await clearEmployeeDocumentationFileService(userId, field);
        const data = await selectEmployeeDocumentationService(userId);

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default clearEmployeeDocumentationFileController;
