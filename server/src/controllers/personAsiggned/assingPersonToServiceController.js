import generateErrorUtil from '../../utils/generateErrorUtil.js';
import newAssingPersonToServiceService from '../../services/personAssigned/newAssingPersonToServiceService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const assingPersonToServiceController = async (req, res, next) => {
    try {
        const { role, id: userId } = req.userLogged;
        const { employeeId } = req.body;
        const { serviceId } = req.params;

        if (role !== 'admin' && role !== 'sudo') {
            generateErrorUtil(
                'Solo un administrador tiene permisos para relizar esta operacion',
                402
            );
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await newAssingPersonToServiceService(
            employeeId,
            serviceId
        );

        res.send({
            status: 'ok',
            data: {
                data,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default assingPersonToServiceController;
