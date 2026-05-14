import Joi from 'joi';

import importServiceScheduleExcelService from '../../services/schedules/importServiceScheduleExcelService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const querySchema = Joi.object({
    month: Joi.string()
        .pattern(/^\d{4}-\d{2}$/)
        .required(),
    apply: Joi.string().valid('0', '1', 'false', 'true').default('0'),
    replace: Joi.string().valid('0', '1', 'false', 'true').default('1'),
    allowOverlap: Joi.string().valid('0', '1', 'false', 'true').default('0'),
});

const toBoolean = (value) => value === true || value === '1' || value === 'true';

const parseMappings = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        generateErrorUtil('Mapa de empleados invalido', 400);
    }
};

const importServiceScheduleExcelController = async (req, res, next) => {
    try {
        const { error, value } = querySchema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const file = req.files?.file || req.files?.schedule || req.files?.excel;
        if (!file) generateErrorUtil('Archivo Excel requerido', 400);

        const data = await importServiceScheduleExcelService({
            serviceId: req.params.serviceId,
            filePath: file.tempFilePath,
            month: value.month,
            apply: toBoolean(value.apply),
            replace: toBoolean(value.replace),
            allowOverlap: toBoolean(value.allowOverlap),
            employeeMappings: parseMappings(req.body?.employeeMappings),
            createdBy: req.userLogged.id,
        });

        if (data.applied) {
            emitServiceScheduleChanged(req.params.serviceId, {
                changedBy: req.userLogged.id,
                reason: 'excel_imported',
            });
        }

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default importServiceScheduleExcelController;
