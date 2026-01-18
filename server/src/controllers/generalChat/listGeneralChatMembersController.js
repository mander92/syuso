import ensureGeneralChatAccessService from '../../services/generalChat/ensureGeneralChatAccessService.js';
import listGeneralChatMembersService from '../../services/generalChat/listGeneralChatMembersService.js';

const listGeneralChatMembersController = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { id: userId } = req.userLogged;

        await ensureGeneralChatAccessService(chatId, userId);

        const data = await listGeneralChatMembersService(chatId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listGeneralChatMembersController;
