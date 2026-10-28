import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { upsertSalaryShiftEntries } from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).required(),
    settlementMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    shiftIds: Joi.array().items(Joi.string().length(36)).min(1).max(1000).unique().required(),
    action: Joi.string().valid('paid', 'pending', 'rate', 'reset-rate').required(),
    hourlyRate: Joi.when('action', {
        is: 'rate',
        then: Joi.number().min(0).max(1000000).precision(2).required(),
        otherwise: Joi.forbidden(),
    }),
    amountType: Joi.when('action', {
        is: 'rate',
        then: Joi.string().valid('gross', 'net').default('gross'),
        otherwise: Joi.forbidden(),
    }),
});

const upsertSalaryShiftEntriesController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await upsertSalaryShiftEntries({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            payload: value,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default upsertSalaryShiftEntriesController;
