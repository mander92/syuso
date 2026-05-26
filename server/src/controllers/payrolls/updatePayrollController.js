import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    getPayrollById,
    updatePayroll,
} from '../../services/payrolls/payrollService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).allow('', null),
    payrollMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .allow('', null),
    status: Joi.string().valid('unmatched', 'matched', 'published', 'rejected'),
}).min(1);

const updatePayrollController = async (req, res, next) => {
    try {
        const { payrollId } = req.params;
        const payroll = await getPayrollById(payrollId);
        if (!payroll) generateErrorUtil('Nomina no encontrada', 404);

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const nextEmployeeId =
            value.employeeId !== undefined ? value.employeeId : payroll.employeeId;
        const nextMonth =
            value.payrollMonth !== undefined
                ? value.payrollMonth
                : payroll.payrollMonth;
        const nextStatus = value.status || payroll.status;

        if (nextStatus === 'published' && (!nextEmployeeId || !nextMonth)) {
            generateErrorUtil(
                'Para publicar una nomina debes asignar trabajador y mes',
                400
            );
        }

        await updatePayroll(payrollId, value);
        const data = await getPayrollById(payrollId);

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default updatePayrollController;
