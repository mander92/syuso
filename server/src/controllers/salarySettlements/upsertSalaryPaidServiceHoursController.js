import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { upsertSalaryPaidServiceHours } from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).required(),
    serviceId: Joi.string().length(36).required(),
    settlementMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    hours: Joi.number().min(0).allow('', null),
    notes: Joi.string().max(500).allow('', null),
});

const upsertSalaryPaidServiceHoursController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertSalaryPaidServiceHours({
            userId: req.userLogged.id,
            payload: value,
        });

        res.send({ status: 'ok', data: { id } });
    } catch (error) {
        next(error);
    }
};

export default upsertSalaryPaidServiceHoursController;
