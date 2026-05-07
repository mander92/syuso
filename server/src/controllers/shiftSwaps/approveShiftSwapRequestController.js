import Joi from 'joi';
import approveShiftSwapRequestService from '../../services/shiftSwaps/approveShiftSwapRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getIO } from '../../sockets/io.js';

const paramsSchema = Joi.object({
    id: Joi.string().uuid().required(),
});

const approveShiftSwapRequestController = async (req, res, next) => {
    try {
        const { error, value } = paramsSchema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const adminId = req.userLogged.id;

        const result = await approveShiftSwapRequestService({
            requestId: value.id,
            adminId,
        });

        const io = getIO();
        if (io) {
            io.to(`user:${result.requestorId}`).emit('shiftSwap:approved', result);
            io.to(`user:${result.counterpartId}`).emit('shiftSwap:approved', result);
        }

        res.send({
            status: 'ok',
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export default approveShiftSwapRequestController;
