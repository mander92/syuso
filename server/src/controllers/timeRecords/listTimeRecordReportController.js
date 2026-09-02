import listTimeRecordReportService from '../../services/timeRecords/listTimeRecordReportService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectUserByIdService from '../../services/users/selectUserByIdService.js';

const parseDashboardPermissions = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

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

        if (normalizedRole !== 'sudo') {
            const currentUser = await selectUserByIdService(userId);
            const permissions = parseDashboardPermissions(
                currentUser?.dashboardPermissions
            );
            if (permissions !== null && !permissions.includes('timeRecords')) {
                generateErrorUtil('No tienes permiso para ver el registro horario', 403);
            }
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
