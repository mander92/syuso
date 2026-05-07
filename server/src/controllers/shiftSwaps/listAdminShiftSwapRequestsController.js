import listAdminShiftSwapRequestsService from '../../services/shiftSwaps/listAdminShiftSwapRequestsService.js';

const listAdminShiftSwapRequestsController = async (_req, res, next) => {
    try {
        const swaps = await listAdminShiftSwapRequestsService();
        res.send({ status: 'ok', data: swaps });
    } catch (error) {
        next(error);
    }
};

export default listAdminShiftSwapRequestsController;
