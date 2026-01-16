import ensureServiceChatAccessService from '../../services/serviceChat/ensureServiceChatAccessService.js';
import ensureServiceChatNotPausedService from '../../services/serviceChat/ensureServiceChatNotPausedService.js';
import { saveChatImageUtil } from '../../utils/chatImageUtil.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const uploadServiceChatImageController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceChatAccessService(serviceId, userId, role);
        await ensureServiceChatNotPausedService(serviceId);

        if (!req.files?.image) {
            generateErrorUtil('Debes seleccionar una imagen', 400);
        }

        const imagePath = await saveChatImageUtil(req.files.image);

        res.send({
            status: 'ok',
            data: {
                imagePath,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default uploadServiceChatImageController;
