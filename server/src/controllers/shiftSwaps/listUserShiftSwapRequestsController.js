import listUserShiftSwapRequestsService from '../../services/shiftSwaps/listUserShiftSwapRequestsService.js';

const listUserShiftSwapRequestsController = async (req, res, next) => {
    try {
        const swaps = await listUserShiftSwapRequestsService(req.userLogged.id);
        res.send({ status: 'ok', data: swaps });
    } catch (error) {
        next(error);
    }
};

export default listUserShiftSwapRequestsController;
