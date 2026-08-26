import { deleteSalaryAdjustment } from '../../services/salarySettlements/salarySettlementService.js';

const deleteSalaryAdjustmentController = async (req, res, next) => {
    try {
        await deleteSalaryAdjustment(req.params.adjustmentId);
        res.send({ status: 'ok', data: { id: req.params.adjustmentId } });
    } catch (error) {
        next(error);
    }
};

export default deleteSalaryAdjustmentController;
