import deleteServiceShiftTypeService from '../../services/schedules/deleteServiceShiftTypeService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const deleteServiceShiftTypeController = async (req, res, next) => {
    try {
        const { serviceId, shiftTypeId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await deleteServiceShiftTypeService(serviceId, shiftTypeId);

        res.send({
            status: 'ok',
            message: 'Tipo de turno eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceShiftTypeController;
