import Joi from 'joi';
import createShiftSwapRequestService from '../../services/shiftSwaps/createShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getIO } from '../../sockets/io.js';

const bodySchema = Joi.object({
    serviceId: Joi.string().uuid().required(),
    requestType: Joi.string().valid('swap', 'transfer', 'request').default('swap'),
    fromShiftId: Joi.string().uuid(),
    toShiftId: Joi.string().uuid(),
    fromShiftIds: Joi.array().items(Joi.string().uuid()).default([]),
    toShiftIds: Joi.array().items(Joi.string().uuid()).default([]),
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

        const io = getIO();
        if (io) {
            io.to(`user:${newRequest.counterpartId}`).emit(
                'shiftSwap:created',
                newRequest
            );
        }

        res.status(201).send({
            status: 'ok',
            data: newRequest,
        });
    } catch (err) {
        next(err);
    }
};

export default createShiftSwapRequestController;
