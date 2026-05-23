import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import signEmployeeSignatureDocumentService from '../../services/employeeDocumentation/signEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { saveEmployeeSignatureDocumentFile } from '../../utils/employeeDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const signEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        if (document.employeeId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        if (
            document.signaturePath ||
            ['submitted', 'validated', 'signed'].includes(document.status)
        ) {
            generateErrorUtil(
                'Documento ya subido. Solicita permiso a administracion para subir otro.',
                403
            );
        }

        const file = req.files?.document;
        if (!file) generateErrorUtil('Documento firmado requerido', 400);

        const signaturePath = await saveEmployeeSignatureDocumentFile(
            file,
            document.employeeId
        );

        await signEmployeeSignatureDocumentService(
            documentId,
            signaturePath,
            file.name || null
        );
        const data = await selectEmployeeSignatureDocumentService(documentId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: documentId,
            subjectType: 'employeeSignatureDocument',
            employeeId: document.employeeId,
            title: 'Documento subido para validar',
            message: `${data.title}: subido por ${data.firstName || ''} ${data.lastName || ''}`.trim(),
            routeLabel: 'Alertas > Documentacion > Pendiente de validar',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default signEmployeeSignatureDocumentController;
