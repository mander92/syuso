import deleteGeneralChatService from '../../services/generalChat/deleteGeneralChatService.js';

const deleteGeneralChatController = async (req, res, next) => {
    try {
        const { chatId } = req.params;

        await deleteGeneralChatService(chatId);

        res.send({
            status: 'ok',
            message: 'Chat eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteGeneralChatController;
