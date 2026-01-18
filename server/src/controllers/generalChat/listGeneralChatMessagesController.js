import ensureGeneralChatAccessService from '../../services/generalChat/ensureGeneralChatAccessService.js';
import listGeneralChatMessagesService from '../../services/generalChat/listGeneralChatMessagesService.js';
import updateGeneralChatReadService from '../../services/generalChat/updateGeneralChatReadService.js';

const listGeneralChatMessagesController = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { id: userId } = req.userLogged;

        await ensureGeneralChatAccessService(chatId, userId);

        const messages = await listGeneralChatMessagesService(chatId);
        await updateGeneralChatReadService(chatId, userId);

        res.send({
            status: 'ok',
            data: { messages },
        });
    } catch (error) {
        next(error);
    }
};

export default listGeneralChatMessagesController;
