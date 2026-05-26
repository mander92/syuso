import fs from 'fs';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { getPayrollFilePath } from '../../utils/payrollFileUtil.js';
import { getPayrollById } from '../../services/payrolls/payrollService.js';

const getPayrollFileController = async (req, res, next) => {
    try {
        const { payrollId } = req.params;
        const payroll = await getPayrollById(payrollId);
        if (!payroll) generateErrorUtil('Nomina no encontrada', 404);

        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';
        const isOwner = payroll.employeeId === req.userLogged.id;
        if (!isAdmin && (!isOwner || payroll.status !== 'published')) {
            generateErrorUtil('Acceso denegado', 403);
        }

        const filePath = getPayrollFilePath(payroll.filePath);
        if (!fs.existsSync(filePath)) {
            generateErrorUtil('Archivo no encontrado', 404);
        }

        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
};

export default getPayrollFileController;
