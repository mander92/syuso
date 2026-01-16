import Joi from 'joi';

import replaceAdminDelegationsService from '../../services/delegations/replaceAdminDelegationsService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateUserDelegationsController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            delegationIds: Joi.array()
                .items(Joi.string().length(36))
                .required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) {
            generateErrorUtil(validation.error.message, 400);
        }

        const { userId } = req.params;
        const { delegationIds } = validation.value;

        await replaceAdminDelegationsService(userId, delegationIds);

        res.send({
            status: 'ok',
            message: 'Delegaciones actualizadas',
        });
    } catch (error) {
        next(error);
    }
};

export default updateUserDelegationsController;
