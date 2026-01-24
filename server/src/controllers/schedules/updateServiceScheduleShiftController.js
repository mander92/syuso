import updateServiceScheduleShiftService from '../../services/schedules/updateServiceScheduleShiftService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const updateServiceScheduleShiftController = async (req, res, next) => {
    try {
        const { serviceId, shiftId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await updateServiceScheduleShiftService(shiftId, req.body);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateServiceScheduleShiftController;
