import Joi from 'joi';
import createShiftSwapRequestService from '../../services/shiftSwaps/createShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const bodySchema = Joi.object({
    serviceId: Joi.string().uuid().required(),
    requestType: Joi.string().valid('swap', 'transfer', 'request').default('swap'),
    requestorId: Joi.string().uuid().required(),
    counterpartId: Joi.string().uuid().required(),
    fromShiftId: Joi.string().uuid(),
    toShiftId: Joi.string().uuid(),
    fromShiftIds: Joi.array().items(Joi.string().uuid()).default([]),
    toShiftIds: Joi.array().items(Joi.string().uuid()).default([]),
    reason: Joi.string().max(255).allow('', null),
});

const createAdminShiftSwapRequestController = async (req, res, next) => {
    try {
        const { error, value } = bodySchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const newRequest = await createShiftSwapRequestService(value);

        res.status(201).send({
            status: 'ok',
            data: newRequest,
        });
    } catch (err) {
        next(err);
    }
};

export default createAdminShiftSwapRequestController;
