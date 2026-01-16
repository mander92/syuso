import Joi from 'joi';

import ensureServiceChatAccessService from '../../services/serviceChat/ensureServiceChatAccessService.js';
import createServiceChatMessageService from '../../services/serviceChat/createServiceChatMessageService.js';
import ensureServiceChatNotPausedService from '../../services/serviceChat/ensureServiceChatNotPausedService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createServiceChatMessageController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            message: Joi.string().allow('').trim().max(2000).optional(),
            imagePath: Joi.string().allow('').max(255).optional(),
            replyToMessageId: Joi.string().allow(null, '').max(36).optional(),
        }).custom((value, helpers) => {
            const message = value.message?.trim();
            const imagePath = value.imagePath?.trim();
            if (!message && !imagePath) {
                return helpers.error('any.invalid');
            }
            return value;
        });

        const validation = schema.validate(req.body);

        if (validation.error) {
            generateErrorUtil('Mensaje vacio', 400);
        }

        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;
        const {
            message = '',
            imagePath = null,
            replyToMessageId = null,
        } = validation.value;

        await ensureServiceChatAccessService(serviceId, userId, role);
        await ensureServiceChatNotPausedService(serviceId);

        const newMessage = await createServiceChatMessageService(
            serviceId,
            userId,
            message.trim(),
            imagePath?.trim() || null,
            replyToMessageId?.trim() || null
        );

        res.send({
            status: 'ok',
            data: newMessage,
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceChatMessageController;
