import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import validateEmployeeSignatureDocumentService from '../../services/employeeDocumentation/validateEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const validateEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: document.employeeId,
        });

        if (!document.signaturePath) {
            generateErrorUtil('No hay documento subido para validar', 400);
        }

        await validateEmployeeSignatureDocumentService(
            documentId,
            req.userLogged.id
        );
        const data = await selectEmployeeSignatureDocumentService(documentId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: documentId,
            subjectType: 'employeeSignatureDocument',
            userIds: [document.employeeId],
            title: 'Documento validado',
            message: `${data.title}: validado por administracion`,
            routeLabel: 'Alertas > Documentacion > Validado',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default validateEmployeeSignatureDocumentController;
