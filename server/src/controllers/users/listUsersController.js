import selectUsersService from '../../services/users/selectUsersService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';

const listUsersController = async (req, res, next) => {
    try {
        const { job, active, city, role, delegationId } = req.query;
        const { id: userId, role: userRole } = req.userLogged;

        let allowedDelegations = [];

        if (userRole === 'admin') {
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

        if (userRole === 'admin' && !allowedDelegations.length) {
            return res.send({ status: 'ok', data: [] });
        }

        const data = await selectUsersService(
            job,
            active,
            city,
            role,
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

export default listUsersController;
