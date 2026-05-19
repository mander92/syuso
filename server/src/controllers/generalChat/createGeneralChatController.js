import createGeneralChatService from '../../services/generalChat/createGeneralChatService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createGeneralChatController = async (req, res, next) => {
    try {
        const { id: userId, role } = req.userLogged;
        const { name, type, memberIds } = req.body || {};

        if (role !== 'admin' && role !== 'sudo') {
            generateErrorUtil('No autorizado', 403);
        }

        if (!name || typeof name !== 'string') {
            generateErrorUtil('Nombre requerido', 400);
        }

        const normalizedType = ['announcement', 'direct'].includes(type)
            ? type
            : 'standard';

        if (normalizedType === 'direct' && !Array.isArray(memberIds)) {
            generateErrorUtil('Trabajador requerido', 400);
        }

        const data = await createGeneralChatService(
            name.trim(),
            normalizedType,
            userId,
            Array.isArray(memberIds) ? memberIds : [],
            { id: userId, role }
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createGeneralChatController;
