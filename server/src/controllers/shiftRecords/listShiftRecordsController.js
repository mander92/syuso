import selectShiftRecordsService from '../../services/shiftRecords/selectShiftRecordsService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';

const listShiftRecordsController = async (req, res, next) => {
    try {
        const {
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            generateExcel,
            delegationId,
        } = req.query;

        const { id: userId, role } = req.userLogged;
        let allowedDelegations = [];

        if (role === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(
                userId
            );
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
            return res.send({ status: 'ok', data: { details: [], totals: [] } });
        }

        const data = await selectShiftRecordsService(
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            generateExcel,
            allowedDelegations
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listShiftRecordsController;
