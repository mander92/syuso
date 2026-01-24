import deleteServiceScheduleShiftService from '../../services/schedules/deleteServiceScheduleShiftService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const deleteServiceScheduleShiftController = async (req, res, next) => {
    try {
        const { serviceId, shiftId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await deleteServiceScheduleShiftService(shiftId);

        res.send({
            status: 'ok',
            message: 'Turno eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceScheduleShiftController;
