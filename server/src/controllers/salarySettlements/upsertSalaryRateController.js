import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    listSalaryRates,
    upsertSalaryRate,
} from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    serviceId: Joi.string().length(36).required(),
    employeeId: Joi.string().length(36).allow('', null),
    payMode: Joi.string().valid('hourly', 'fixed').default('hourly'),
    amountType: Joi.string().valid('gross', 'net').default('gross'),
    regularRate: Joi.number().min(0).allow('', null),
    nightRate: Joi.number().min(0).allow('', null),
    holidayRate: Joi.number().min(0).allow('', null),
    extraRate: Joi.number().min(0).allow('', null),
    fixedAmount: Joi.number().min(0).allow('', null),
    notes: Joi.string().max(500).allow('', null),
});

const upsertSalaryRateController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertSalaryRate({
            userId: req.userLogged.id,
            payload: value,
        });
        const rates = await listSalaryRates({
            serviceId: value.serviceId,
            employeeId: value.employeeId,
        });

        res.send({ status: 'ok', data: { id, rates } });
    } catch (error) {
        next(error);
    }
};

export default upsertSalaryRateController;
