import listShiftRecordAuditLogsService from '../../services/shiftRecords/listShiftRecordAuditLogsService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';

const listShiftRecordAuditLogsController = async (req, res, next) => {
    try {
        const {
            employeeId,
            serviceId,
            action,
            startDate,
            endDate,
            generateExcel,
            delegationId,
        } = req.query;

        const { id: userId, role } = req.userLogged;
        let allowedDelegations = [];

        if (role === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(userId);
        }

        if (delegationId) {
            const delegation = await selectDelegationByIdService(delegationId);
            if (delegation) {
                allowedDelegations = allowedDelegations.length
                    ? allowedDelegations.filter(
                          (name) => name === delegation.name
                      )
                    : [delegation.name];
            }
        }

        if (role === 'admin' && !allowedDelegations.length) {
            return res.send({ status: 'ok', data: { logs: [] } });
        }

        const data = await listShiftRecordAuditLogsService({
            employeeId,
            serviceId,
            action,
            startDate,
            endDate,
            generateExcel: generateExcel === 'true' || generateExcel === true,
            delegationNames: allowedDelegations,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listShiftRecordAuditLogsController;
