import Joi from 'joi';
import confirmShiftSwapRequestService from '../../services/shiftSwaps/confirmShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getIO } from '../../sockets/io.js';

const paramsSchema = Joi.object({
    id: Joi.string().uuid().required(),
});

const confirmShiftSwapRequestController = async (req, res, next) => {
    try {
        const { error, value } = paramsSchema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const swap = await confirmShiftSwapRequestService({
            requestId: value.id,
            userId: req.userLogged.id,
        });

        const io = getIO();
        if (io) {
            io.to(`user:${swap.requestorId}`).emit('shiftSwap:confirmed', swap);
            io.to('admins').emit('shiftSwap:confirmed', swap);
        }

        res.send({ status: 'ok', data: swap });
    } catch (error) {
        next(error);
    }
};

export default confirmShiftSwapRequestController;
