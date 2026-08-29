import Joi from 'joi';

import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import listAvailableScheduleEmployeesService from '../../services/schedules/listAvailableScheduleEmployeesService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const schema = Joi.object({
    scheduleDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
    startTime: Joi.string()
        .pattern(/^\d{2}:\d{2}(:\d{2})?$/)
        .required(),
    endTime: Joi.string()
        .pattern(/^\d{2}:\d{2}(:\d{2})?$/)
        .required(),
    excludeShiftId: Joi.string().guid({ version: 'uuidv4' }).allow('', null),
});

const listAvailableScheduleEmployeesController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;
        const { error, value } = schema.validate(req.query || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await listAvailableScheduleEmployeesService({
            serviceId,
            ...value,
            excludeShiftId: value.excludeShiftId || '',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listAvailableScheduleEmployeesController;
