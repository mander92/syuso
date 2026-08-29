import Joi from 'joi';

import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { createAcknowledgementService } from '../../services/acknowledgements/acknowledgementService.js';
import {
    emitServiceScheduleChanged,
    selectServiceScheduleRecipientUserIds,
} from '../../utils/serviceScheduleNotificationUtil.js';

const schema = Joi.object({
    month: Joi.string()
        .pattern(/^\d{4}-\d{2}$/)
        .allow('', null),
    message: Joi.string().max(180).allow('', null),
});

const notifyServiceScheduleController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const message =
            value.message ||
            'Hay cambios en tu cuadrante. Revisa los turnos actualizados.';
        const recipientUserIds = await selectServiceScheduleRecipientUserIds(
            serviceId,
            { month: value.month || '' }
        );
        await createAcknowledgementService({
            subjectType: 'schedule',
            subjectId: serviceId,
            title: 'Cuadrante enviado',
            message,
            url: '/account',
            recipientUserIds,
            createdBy: userId,
            push: false,
        });

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'schedule_manual_push',
            message,
            month: value.month || '',
            push: true,
        });

        res.send({
            status: 'ok',
            data: { serviceId, month: value.month || null },
        });
    } catch (error) {
        next(error);
    }
};

export default notifyServiceScheduleController;
