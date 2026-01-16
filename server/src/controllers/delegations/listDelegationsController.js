import selectDelegationsService from '../../services/delegations/selectDelegationsService.js';

const listDelegationsController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;

        const data = await selectDelegationsService(userId, role);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listDelegationsController;
