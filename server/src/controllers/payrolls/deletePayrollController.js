import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    deletePayroll,
    getPayrollById,
} from '../../services/payrolls/payrollService.js';

const deletePayrollController = async (req, res, next) => {
    try {
        const { payrollId } = req.params;
        const payroll = await getPayrollById(payrollId);
        if (!payroll) generateErrorUtil('Nomina no encontrada', 404);

        await deletePayroll(payrollId);
        res.send({ status: 'ok', data: { id: payrollId } });
    } catch (error) {
        next(error);
    }
};

export default deletePayrollController;
