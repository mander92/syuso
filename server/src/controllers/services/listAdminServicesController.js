import selectServiceService from '../../services/services/selectServiceService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';

const listAdminServicesController = async (req, res, next) => {
    try {
        const { status, type, delegationId, startDateFrom, startDateTo } =
            req.query;
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
            return res.send({ status: 'ok', data: [] });
        }

        const data = await selectServiceService(
            status,
            type,
            allowedDelegations,
            startDateFrom,
            startDateTo
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listAdminServicesController;
