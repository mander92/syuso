import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { upsertSalaryAbsencePayment } from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).required(),
    settlementMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    absenceType: Joi.string().valid('vacation', 'sick').required(),
    days: Joi.number().min(0).allow('', null),
    amount: Joi.number().min(0).allow('', null),
    amountType: Joi.string().valid('gross', 'net').default('gross'),
    notes: Joi.string().max(500).allow('', null),
});

const upsertSalaryAbsencePaymentController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertSalaryAbsencePayment({
            userId: req.userLogged.id,
            payload: value,
        });

        res.send({ status: 'ok', data: { id } });
    } catch (error) {
        next(error);
    }
};

export default upsertSalaryAbsencePaymentController;
