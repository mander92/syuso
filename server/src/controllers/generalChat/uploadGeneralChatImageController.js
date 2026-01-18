import ensureGeneralChatAccessService from '../../services/generalChat/ensureGeneralChatAccessService.js';
import { saveGeneralChatImageUtil } from '../../utils/generalChatImageUtil.js';

const uploadGeneralChatImageController = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { id: userId } = req.userLogged;

        await ensureGeneralChatAccessService(chatId, userId);

        const imagePath = await saveGeneralChatImageUtil(req.files?.image);

        res.send({
            status: 'ok',
            data: { imagePath },
        });
    } catch (error) {
        next(error);
    }
};

export default uploadGeneralChatImageController;
