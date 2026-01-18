import selectInProgressServicesService from '../../services/services/selectInProgressServicesService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';

const listInProgressServicesController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;
        const { delegationId } = req.query;

        if (role !== 'admin' && role !== 'client' && role !== 'sudo') {
            generateErrorUtil('Acceso denegado', 403);
        }

        let allowedDelegations =
            role === 'admin'
                ? await selectAdminDelegationNamesService(userId)
                : [];

        if (delegationId) {
            const { default: selectDelegationByIdService } = await import(
                '../../services/delegations/selectDelegationByIdService.js'
            );
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
            return res.send({ status: 'ok', data: [] });
        }

        const rows = await selectInProgressServicesService(
            role === 'client' ? userId : null,
            allowedDelegations
        );

        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.serviceId]) {
                acc[row.serviceId] = {
                    serviceId: row.serviceId,
                    name: row.name,
                    status: row.status,
                    startDateTime: row.startDateTime,
                    endDateTime: row.endDateTime,
                    hours: row.hours,
                    scheduleImage: row.scheduleImage,
                    address: row.address,
                    city: row.city,
                    postCode: row.postCode,
                    type: row.type,
                    activeEmployees: [],
                };
            }

            if (row.employeeId) {
                acc[row.serviceId].activeEmployees.push({
                    shiftId: row.assignmentId,
                    employeeId: row.employeeId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    clockIn: null,
                });
            }

            return acc;
        }, {});

        res.send({
            status: 'ok',
            data: Object.values(grouped),
        });
    } catch (error) {
        next(error);
    }
};

export default listInProgressServicesController;
