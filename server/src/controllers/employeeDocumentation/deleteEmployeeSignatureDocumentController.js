import deleteEmployeeSignatureDocumentService from '../../services/employeeDocumentation/deleteEmployeeSignatureDocumentService.js';
import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const deleteEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: document.employeeId,
        });

        await deleteEmployeeSignatureDocumentService(documentId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: documentId,
            subjectType: 'employeeSignatureDocument',
            employeeId: document.employeeId,
            userIds: [document.employeeId],
            title: 'Documento borrado',
            message: `${document.title}: documento eliminado`,
            routeLabel: 'Alertas > Documentacion',
        });

        res.send({ status: 'ok' });
    } catch (error) {
        next(error);
    }
};

export default deleteEmployeeSignatureDocumentController;
