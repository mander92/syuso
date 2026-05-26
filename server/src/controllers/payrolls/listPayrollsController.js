import listAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import {
    listPayrollEmployees,
    listPayrolls,
} from '../../services/payrolls/payrollService.js';

const listPayrollsController = async (req, res, next) => {
    try {
        const { employeeId = '', month = '', status = '' } = req.query;
        const payrolls = await listPayrolls({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId,
            month,
            status,
        });
        const employees =
            req.userLogged.role === 'employee'
                ? []
                : await listPayrollEmployees({
                      viewerId: req.userLogged.id,
                      viewerRole: req.userLogged.role,
                  });
        const delegations =
            req.userLogged.role === 'admin'
                ? await listAdminDelegationNamesService(req.userLogged.id)
                : [];

        res.send({
            status: 'ok',
            data: { payrolls, employees, delegations },
        });
    } catch (error) {
        next(error);
    }
};

export default listPayrollsController;
