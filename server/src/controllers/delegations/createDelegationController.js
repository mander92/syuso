import Joi from 'joi';

import insertDelegationService from '../../services/delegations/insertDelegationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createDelegationController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().trim().min(2).max(60).required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) {
            generateErrorUtil(validation.error.message, 400);
        }

        const { name } = validation.value;

        const data = await insertDelegationService(name);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createDelegationController;
