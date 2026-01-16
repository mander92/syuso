import ensureServiceChatAccessService from '../../services/serviceChat/ensureServiceChatAccessService.js';
import listServiceChatMessagesService from '../../services/serviceChat/listServiceChatMessagesService.js';

const listServiceChatMessagesController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceChatAccessService(serviceId, userId, role);

        const data = await listServiceChatMessagesService(serviceId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceChatMessagesController;
