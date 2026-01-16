import Joi from 'joi';

import updateServiceStatusService from '../../services/services/updateServiceStatusService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateServiceStatusController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            status: Joi.string().valid('completed', 'confirmed').required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) {
            generateErrorUtil(validation.error.message, 400);
        }

        const { serviceId } = req.params;
        const { status } = validation.value;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await updateServiceStatusService(serviceId, status);

        res.send({
            status: 'ok',
            message: 'Estado actualizado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default updateServiceStatusController;
