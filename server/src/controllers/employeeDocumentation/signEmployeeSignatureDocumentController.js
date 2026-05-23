import Joi from 'joi';

import selectEmployeeSignatureDocumentService from '../../services/employeeDocumentation/selectEmployeeSignatureDocumentService.js';
import signEmployeeSignatureDocumentService from '../../services/employeeDocumentation/signEmployeeSignatureDocumentService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { saveEmployeeSignatureImage } from '../../utils/employeeDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const signEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const document = await selectEmployeeSignatureDocumentService(documentId);
        if (!document) generateErrorUtil('Documento no encontrado', 404);

        if (document.employeeId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        const schema = Joi.object({
            signature: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const signaturePath = await saveEmployeeSignatureImage(
            value.signature,
            document.employeeId
        );

        await signEmployeeSignatureDocumentService(documentId, signaturePath);
        const data = await selectEmployeeSignatureDocumentService(documentId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: documentId,
            subjectType: 'employeeSignatureDocument',
            title: 'Documento firmado',
            message: `${data.title}: firmado por ${data.firstName || ''} ${data.lastName || ''}`.trim(),
            routeLabel: 'Alertas > Documentacion > Firmados',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default signEmployeeSignatureDocumentController;
