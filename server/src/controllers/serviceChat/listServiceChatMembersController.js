import ensureServiceChatAccessService from '../../services/serviceChat/ensureServiceChatAccessService.js';
import listServiceChatMembersService from '../../services/serviceChat/listServiceChatMembersService.js';

const listServiceChatMembersController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceChatAccessService(serviceId, userId, role);

        const members = await listServiceChatMembersService(serviceId);

        res.send({
            status: 'ok',
            data: members,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceChatMembersController;
