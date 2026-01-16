import deleteDelegationService from '../../services/delegations/deleteDelegationService.js';

const deleteDelegationController = async (req, res, next) => {
    try {
        const { delegationId } = req.params;

        await deleteDelegationService(delegationId);

        res.send({
            status: 'ok',
            message: 'Delegacion eliminada',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteDelegationController;
