import createServiceShiftTypeService from '../../services/schedules/createServiceShiftTypeService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createServiceShiftTypeController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { name, color } = req.body;
        const { id: userId, role } = req.userLogged;

        if (!name || !color) {
            generateErrorUtil('Nombre y color son obligatorios', 400);
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await createServiceShiftTypeService(
            serviceId,
            name.trim(),
            color.trim(),
            userId
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceShiftTypeController;
