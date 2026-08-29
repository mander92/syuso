import Joi from 'joi';

import deleteServiceScheduleMonthService from '../../services/schedules/deleteServiceScheduleMonthService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const schema = Joi.object({
    month: Joi.string()
        .pattern(/^\d{4}-\d{2}$/)
        .required(),
});

const deleteServiceScheduleMonthController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await deleteServiceScheduleMonthService(
            serviceId,
            value.month
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'schedule_month_deleted',
            month: value.month,
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceScheduleMonthController;
