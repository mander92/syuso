import Joi from 'joi';

import createEmployeeSignatureDocumentService from '../../services/employeeDocumentation/createEmployeeSignatureDocumentService.js';
import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { saveEmployeeSignatureDocumentFile } from '../../utils/employeeDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const createEmployeeSignatureDocumentController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            employeeId: Joi.string().guid({ version: 'uuidv4' }).required(),
            title: Joi.string().max(150).required(),
            dueDate: Joi.date().allow('', null),
            periodMonth: Joi.string()
                .pattern(/^\d{4}-\d{2}$/)
                .allow('', null),
            documentType: Joi.string()
                .valid(
                    'epi',
                    'information',
                    'dataProtection',
                    'contract',
                    'medical',
                    'riskAssessment',
                    'tax',
                    'other'
                )
                .default('other'),
        });

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const employee = await selectEmployeeDocumentationService(value.employeeId);
        if (!employee || employee.role !== 'employee') {
            generateErrorUtil('Trabajador no encontrado', 404);
        }

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: value.employeeId,
        });

        const file = req.files?.document;
        if (!file) generateErrorUtil('Documento requerido', 400);

        const originalFilePath = await saveEmployeeSignatureDocumentFile(
            file,
            value.employeeId
        );

        const data = await createEmployeeSignatureDocumentService({
            ...value,
            originalFilePath,
            originalFileName: file.name,
            createdBy: req.userLogged.id,
        });

        const fullName =
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            data.email ||
            'Trabajador';
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: data.id,
            subjectType: 'employeeSignatureDocument',
            userIds: [value.employeeId],
            title: 'Documento pendiente de firma',
            message: `${fullName}: ${data.title}`,
            routeLabel: 'Alertas > Documentacion > Pendiente de firma',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default createEmployeeSignatureDocumentController;
