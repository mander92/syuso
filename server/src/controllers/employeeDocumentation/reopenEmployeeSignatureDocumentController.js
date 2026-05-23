import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import reopenEmployeeSignatureDocumentService from '../../services/employeeDocumentation/reopenEmployeeSignatureDocumentService.js';
import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const reopenEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: document.employeeId,
        });

        await reopenEmployeeSignatureDocumentService(documentId);
        const data = await selectEmployeeSignatureDocumentService(documentId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: documentId,
            subjectType: 'employeeSignatureDocument',
            userIds: [document.employeeId],
            title: 'Documento reabierto',
            message: `${data.title}: puedes subir una nueva version firmada`,
            routeLabel: 'Alertas > Documentacion > Pendiente de firma',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default reopenEmployeeSignatureDocumentController;
