import Joi from 'joi';

import ignorePendingBillingService from '../../services/billing/ignorePendingBillingService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ignorePendingBillingController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            serviceId: Joi.string().guid({ version: 'uuidv4' }).required(),
            periodStart: Joi.date().iso().required(),
            periodEnd: Joi.date().iso().required(),
            reason: Joi.string().max(255).allow('', null),
        });

        const { error, value } = schema.validate(req.body || {});
        if (error) generateErrorUtil(error.message, 400);

        const data = await ignorePendingBillingService({
            ...value,
            ignoredBy: req.userLogged.id,
        });

        res.send({
            status: 'ok',
            message: 'Servicio quitado de pendientes de facturar',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default ignorePendingBillingController;
