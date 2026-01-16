import selectDelegationsByAdminIdService from '../../services/delegations/selectDelegationsByAdminIdService.js';

const getUserDelegationsController = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const data = await selectDelegationsByAdminIdService(userId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default getUserDelegationsController;
