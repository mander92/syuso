import Joi from 'joi';
import createShiftSwapRequestService from '../../services/shiftSwaps/createShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const bodySchema = Joi.object({
    serviceId: Joi.string().uuid().required(),
    fromShiftId: Joi.string().uuid().required(),
    toShiftId: Joi.string().uuid().required(),
    counterpartId: Joi.string().uuid().required(),
    reason: Joi.string().max(255).allow('', null),
});

const createShiftSwapRequestController = async (req, res, next) => {
    try {
        const { error, value } = bodySchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const requestorId = req.userLogged.id;

        const newRequest = await createShiftSwapRequestService({
            ...value,
            requestorId,
        });

        res.status(201).send({
            status: 'ok',
            data: newRequest,
        });
    } catch (err) {
        next(err);
    }
};

export default createShiftSwapRequestController;
