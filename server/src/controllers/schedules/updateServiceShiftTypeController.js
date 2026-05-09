import updateServiceShiftTypeService from '../../services/schedules/updateServiceShiftTypeService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const updateServiceShiftTypeController = async (req, res, next) => {
    try {
        const { serviceId, shiftTypeId } = req.params;
        const { name, color } = req.body;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await updateServiceShiftTypeService(
            serviceId,
            shiftTypeId,
            { name, color }
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'shift_type_updated',
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateServiceShiftTypeController;
