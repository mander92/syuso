import deleteServiceShiftTypeService from '../../services/schedules/deleteServiceShiftTypeService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const deleteServiceShiftTypeController = async (req, res, next) => {
    try {
        const { serviceId, shiftTypeId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await deleteServiceShiftTypeService(serviceId, shiftTypeId);

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'shift_type_deleted',
        });

        res.send({
            status: 'ok',
            message: 'Tipo de turno eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceShiftTypeController;
