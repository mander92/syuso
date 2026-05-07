import Joi from 'joi';
import rejectCounterpartShiftSwapRequestService from '../../services/shiftSwaps/rejectCounterpartShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getIO } from '../../sockets/io.js';

const paramsSchema = Joi.object({
    id: Joi.string().uuid().required(),
});

const bodySchema = Joi.object({
    reason: Joi.string().max(255).allow('', null),
});

const rejectCounterpartShiftSwapRequestController = async (req, res, next) => {
    try {
        const { error: paramsError, value: params } = paramsSchema.validate(
            req.params,
            { abortEarly: false, stripUnknown: true }
        );
        if (paramsError) generateErrorUtil(paramsError.message, 400);

        const { error, value } = bodySchema.validate(req.body || {}, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const swap = await rejectCounterpartShiftSwapRequestService({
            requestId: params.id,
            userId: req.userLogged.id,
            reason: value.reason || null,
        });

        const io = getIO();
        if (io) {
            io.to(`user:${swap.requestorId}`).emit('shiftSwap:rejected', swap);
        }

        res.send({ status: 'ok', data: swap });
    } catch (err) {
        next(err);
    }
};

export default rejectCounterpartShiftSwapRequestController;
