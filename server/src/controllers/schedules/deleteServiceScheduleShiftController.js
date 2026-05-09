import deleteServiceScheduleShiftService from '../../services/schedules/deleteServiceScheduleShiftService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const deleteServiceScheduleShiftController = async (req, res, next) => {
    try {
        const { serviceId, shiftId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await deleteServiceScheduleShiftService(shiftId);

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'shift_deleted',
        });

        res.send({
            status: 'ok',
            message: 'Turno eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceScheduleShiftController;
