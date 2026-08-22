import Joi from 'joi';

import { replaceServiceScheduleEmployeeOrderService } from '../../services/schedules/serviceScheduleEmployeeOrderService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const schema = Joi.object({
    employeeIds: Joi.array().items(Joi.string().length(36)).required(),
});

const replaceServiceScheduleEmployeeOrderController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await replaceServiceScheduleEmployeeOrderService(
            req.params.serviceId,
            value.employeeIds
        );

        res.send({
            status: 'ok',
            message: 'Orden de trabajadores actualizado',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default replaceServiceScheduleEmployeeOrderController;
