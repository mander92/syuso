import removeGeneralChatMemberService from '../../services/generalChat/removeGeneralChatMemberService.js';
import ensureGeneralChatAccessService from '../../services/generalChat/ensureGeneralChatAccessService.js';

const removeGeneralChatMemberController = async (req, res, next) => {
    try {
        const { chatId, memberId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureGeneralChatAccessService(chatId, userId);

        const removed = await removeGeneralChatMemberService(
            chatId,
            memberId,
            { id: userId, role }
        );

        res.send({
            status: 'ok',
            data: { removed },
        });
    } catch (error) {
        next(error);
    }
};

export default removeGeneralChatMemberController;
