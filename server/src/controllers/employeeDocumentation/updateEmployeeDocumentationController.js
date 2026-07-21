import Joi from 'joi';

import ensureEmployeeDocumentationAccessService from '../../services/employeeDocumentation/ensureEmployeeDocumentationAccessService.js';
import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import upsertEmployeeDocumentationService from '../../services/employeeDocumentation/upsertEmployeeDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    allowedDocumentationFileFields,
    saveEmployeeDocumentationFile,
} from '../../utils/employeeDocumentationFileUtil.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const updateEmployeeDocumentationController = async (req, res, next) => {
    try {
        const targetUserId = req.params.userId || req.userLogged.id;
        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';

        if (!isAdmin && targetUserId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        await ensureEmployeeDocumentationAccessService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: targetUserId,
        });

        const schema = Joi.object({
            birthDate: Joi.date().allow('', null),
            bankAccount: Joi.string().max(40).allow('', null),
            address: Joi.string().max(255).allow('', null),
            phone: Joi.string().max(20).allow('', null),
            socialSecurityNumber: Joi.string().max(40).allow('', null),
            poloSize: Joi.string()
                .valid('XXXL', 'XXL', 'XL', 'L', 'M', 'S')
                .allow('', null),
            pantsSize: Joi.string()
                .valid('XXXL', 'XXL', 'XL', 'L', 'M', 'S')
                .allow('', null),
            status: Joi.string()
                .valid('pending', 'submitted', 'reviewed', 'rejected')
                .allow(null),
            reviewNotes: Joi.string().max(500).allow('', null),
        });

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });

        if (error) generateErrorUtil(error.message, 400);

        if (!isAdmin) {
            value.status = 'submitted';
            delete value.reviewNotes;
        }

        const existing = await selectEmployeeDocumentationService(targetUserId);
        if (!existing) generateErrorUtil('Usuario no encontrado', 404);

        const filesPayload = {};
        for (const field of allowedDocumentationFileFields) {
            const file = req.files?.[field];
            if (file) {
                if (existing[field]) {
                    generateErrorUtil(
                        'Ya existe un archivo para este documento. Administracion debe permitir una nueva subida antes de reemplazarlo.',
                        403
                    );
                }
                filesPayload[field] = await saveEmployeeDocumentationFile(
                    file,
                    targetUserId,
                    field
                );
            }
        }

        await upsertEmployeeDocumentationService(targetUserId, {
            ...value,
            ...filesPayload,
        });

        const data = await selectEmployeeDocumentationService(targetUserId);
        const fullName =
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            data.email ||
            'Trabajador';
        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: targetUserId,
            subjectType: 'employee',
            employeeId: targetUserId,
            userIds: targetUserId !== req.userLogged.id ? [targetUserId] : [],
            title: 'Documentacion de trabajador',
            message: `${fullName}: ficha documental actualizada`,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default updateEmployeeDocumentationController;
