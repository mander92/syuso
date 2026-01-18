import generateErrorUtil from '../../utils/generateErrorUtil.js';
import listGeneralChatUnreadCountsService from '../../services/generalChat/listGeneralChatUnreadCountsService.js';

const listGeneralChatUnreadCountsController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;

        if (role === 'client') {
            generateErrorUtil('No autorizado', 403);
        }

        const data = await listGeneralChatUnreadCountsService(userId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listGeneralChatUnreadCountsController;
