import addGeneralChatMembersService from '../../services/generalChat/addGeneralChatMembersService.js';
import ensureGeneralChatAccessService from '../../services/generalChat/ensureGeneralChatAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const addGeneralChatMembersController = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { memberIds } = req.body || {};
        const { id: userId, role } = req.userLogged;

        await ensureGeneralChatAccessService(chatId, userId);

        if (!Array.isArray(memberIds) || !memberIds.length) {
            generateErrorUtil('Debes indicar miembros', 400);
        }

        const added = await addGeneralChatMembersService(
            chatId,
            memberIds,
            { id: userId, role }
        );

        res.send({
            status: 'ok',
            data: { added },
        });
    } catch (error) {
        next(error);
    }
};

export default addGeneralChatMembersController;
