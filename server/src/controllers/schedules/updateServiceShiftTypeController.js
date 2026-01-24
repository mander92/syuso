import updateServiceShiftTypeService from '../../services/schedules/updateServiceShiftTypeService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

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

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateServiceShiftTypeController;
