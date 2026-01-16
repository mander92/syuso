import Joi from 'joi';

import updateDelegationService from '../../services/delegations/updateDelegationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateDelegationController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().trim().min(2).max(60).required(),
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            generateErrorUtil(error.message, 400);
        }

        const { delegationId } = req.params;

        const data = await updateDelegationService(
            delegationId,
            value.name
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateDelegationController;
