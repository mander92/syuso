import listTimeRecordReportService from '../../services/timeRecords/listTimeRecordReportService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const listTimeRecordReportController = async (req, res, next) => {
    try {
        const {
            month,
            employeeId,
            serviceId,
            delegationId,
            generateExcel,
            generatePdf,
        } = req.query;
        const { id: userId, role } = req.userLogged;
        const normalizedRole = String(role || '').toLowerCase();
        const isAdmin = normalizedRole === 'admin' || normalizedRole === 'sudo';
        const isEmployee =
            normalizedRole === 'employee' || normalizedRole === 'empleado';

        if (!isAdmin && !isEmployee) {
            generateErrorUtil('Acceso denegado', 403);
        }
        let allowedDelegations = [];

        if (normalizedRole === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(userId);
        }

        if (delegationId) {
            const delegation = await selectDelegationByIdService(delegationId);
            if (delegation) {
                allowedDelegations = allowedDelegations.length
                    ? allowedDelegations.filter((name) => name === delegation.name)
                    : [delegation.name];
            }
        }

        if (normalizedRole === 'admin' && !allowedDelegations.length) {
            return res.send({
                status: 'ok',
                data: {
                    month,
                    rows: [],
                    summary: {
                        totalRows: 0,
                        okRows: 0,
                        issueRows: 0,
                        absenceRows: 0,
                        realHours: 0,
                        plannedHours: 0,
                    },
                },
            });
        }

        const data = await listTimeRecordReportService({
            month,
            employeeId: isAdmin ? employeeId : userId,
            serviceId,
            delegationNames: allowedDelegations,
            generateExcel: generateExcel === 'true' || generateExcel === true,
            generatePdf: generatePdf === 'true' || generatePdf === true,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listTimeRecordReportController;
