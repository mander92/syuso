import generateErrorUtil from '../../utils/generateErrorUtil.js';
import listServiceChatUnreadCountsService from '../../services/serviceChat/listServiceChatUnreadCountsService.js';

const listServiceChatUnreadCountsController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;

        if (role === 'client') {
            generateErrorUtil('No autorizado', 403);
        }

        const data = await listServiceChatUnreadCountsService(userId, role);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceChatUnreadCountsController;
