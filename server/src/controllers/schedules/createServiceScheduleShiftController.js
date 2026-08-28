import createServiceScheduleShiftService from '../../services/schedules/createServiceScheduleShiftService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';
import { sendPushNotificationToUserService } from '../../services/push/sendPushNotificationService.js';

const createServiceScheduleShiftController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const {
            scheduleDate,
            startTime,
            endTime,
            hours,
            employeeId,
            shiftTypeId,
            allowOverlap,
        } = req.body;
        const { id: userId, role } = req.userLogged;

        if (!scheduleDate || !startTime || !endTime) {
            generateErrorUtil('Fecha y horario son obligatorios', 400);
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await createServiceScheduleShiftService(
            serviceId,
            scheduleDate,
            startTime,
            endTime,
            hours,
            employeeId,
            shiftTypeId,
            userId,
            { allowOverlap: Boolean(allowOverlap) }
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'shift_created',
        });

        if (data.autoAssignedToService && data.employeeId) {
            void sendPushNotificationToUserService(data.employeeId, {
                title: 'Servicio asignado',
                body: 'Se te ha asignado un nuevo servicio desde el cuadrante.',
                url: '/account',
                tag: `service-assigned-${serviceId}`,
            }).catch((error) => {
                console.error('[push] schedule assignment notification failed', {
                    serviceId,
                    employeeId: data.employeeId,
                    message: error.message,
                });
            });
        }

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceScheduleShiftController;
