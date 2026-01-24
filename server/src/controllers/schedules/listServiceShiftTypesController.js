import listServiceShiftTypesService from '../../services/schedules/listServiceShiftTypesService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const listServiceShiftTypesController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await listServiceShiftTypesService(serviceId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceShiftTypesController;
