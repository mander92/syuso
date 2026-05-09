import createServiceScheduleShiftService from '../../services/schedules/createServiceScheduleShiftService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

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
            userId
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'shift_created',
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceScheduleShiftController;
