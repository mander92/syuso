import Joi from 'joi';

import calculateBillingService from '../../services/billing/calculateBillingService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const calculateBillingController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            serviceId: Joi.string().guid({ version: 'uuidv4' }).required(),
            periodStart: Joi.date().iso().required(),
            periodEnd: Joi.date().iso().required(),
            concept: Joi.string().max(255).allow('', null),
            vatPercent: Joi.number().min(0).max(100).allow('', null),
        });

        const { error, value } = schema.validate(req.query);
        if (error) generateErrorUtil(error.message, 400);

        const data = await calculateBillingService(value);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default calculateBillingController;
