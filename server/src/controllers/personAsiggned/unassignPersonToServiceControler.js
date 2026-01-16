import generateErrorUtil from '../../utils/generateErrorUtil.js';
import deletePersonFormService from '../../services/personAssigned/deletePersonFormService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const unassignPersonToServiceControler = async (req, res, next) => {
    try {
        const { role, id: userId } = req.userLogged;
        const { serviceId, employeeId } = req.body;

        if (role !== 'admin' && role !== 'sudo') {
            generateErrorUtil('No tienes permiso para realizar esta accion');
        }

        if (!serviceId || !employeeId) {
            generateErrorUtil('Faltan datos para realizar esta operacion');
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await deletePersonFormService(serviceId, employeeId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default unassignPersonToServiceControler;
