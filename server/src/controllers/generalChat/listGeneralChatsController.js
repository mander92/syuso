import listGeneralChatsService from '../../services/generalChat/listGeneralChatsService.js';

const listGeneralChatsController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;
        if (role === 'client') {
            return res.send({ status: 'ok', data: [] });
        }

        const data = await listGeneralChatsService(userId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listGeneralChatsController;
