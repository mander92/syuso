import applyServiceScheduleTemplateService from '../../services/schedules/applyServiceScheduleTemplateService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const applyServiceScheduleTemplateController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month, startDate } = req.body;
        const { id: userId, role } = req.userLogged;

        if (!month) {
            generateErrorUtil('El mes es obligatorio', 400);
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await applyServiceScheduleTemplateService(
            serviceId,
            month,
            startDate,
            userId
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'template_applied',
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default applyServiceScheduleTemplateController;
