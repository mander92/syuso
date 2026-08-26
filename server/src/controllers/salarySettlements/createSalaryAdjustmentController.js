import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { createSalaryAdjustment } from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).required(),
    serviceId: Joi.string().length(36).allow('', null),
    settlementMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    concept: Joi.string().max(180).required(),
    quantity: Joi.number().min(0).allow('', null),
    unitRate: Joi.number().min(0).allow('', null),
    amount: Joi.number().min(0).allow('', null),
    amountType: Joi.string().valid('gross', 'net').default('gross'),
    notes: Joi.string().max(500).allow('', null),
});

const createSalaryAdjustmentController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await createSalaryAdjustment({
            userId: req.userLogged.id,
            payload: value,
        });

        res.send({ status: 'ok', data: { id } });
    } catch (error) {
        next(error);
    }
};

export default createSalaryAdjustmentController;
