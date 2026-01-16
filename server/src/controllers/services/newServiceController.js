import insertServiceService from '../../services/services/insertServiceService.js';
import insertServiceAdmin from '../../services/services/inserServiceAdmin.js';
import selectTypeOfServiceByIdService from '../../services/typeOfServices/selectTypeOfServiceByIdService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const newServiceController = async (req, res, next) => {
    try {
        const role = req.userLogged.role;

        if (role === 'admin' || role === 'sudo') {
            const { typeOfServiceId } = req.params;
            const {
                startDateTime,
                endDateTime,
                hours,
                numberOfPeople,
                comments,
                address,
                city,
                postCode,
                clientId,
                name,
            } = req.body;

            if (role === 'admin') {
                const typeOfService =
                    await selectTypeOfServiceByIdService(typeOfServiceId);
                const delegations =
                    await selectAdminDelegationNamesService(req.userLogged.id);

                if (
                    !delegations.length ||
                    !delegations.includes(typeOfService.city)
                ) {
                    generateErrorUtil('Acceso denegado', 403);
                }
            }

            const data = await insertServiceAdmin(
                typeOfServiceId,
                startDateTime,
                endDateTime,
                hours,
                numberOfPeople,
                comments,
                address,
                city,
                postCode,
                clientId,
                name
            );
            res.send({
                status: 'ok',
                message:
                    'Servicio creado correctamente, ahora hay que asignar empleado/s al servicio',
                data,
            });
        } else {
            const { typeOfServiceId } = req.params;

            const {
                userId,
                startDateTime,
                endDateTime,
                name,
                hours,
                numberOfPeople,
                comments,
                address,
                city,
                postCode,
            } = req.body;

            const data = await insertServiceService(
                typeOfServiceId,
                userId,
                startDateTime,
                endDateTime,
                name,
                hours,
                numberOfPeople,
                comments,
                address,
                city,
                postCode
            );
            res.send({
                status: 'ok',
                message:
                    'Servicio solicitado correctamente, en cuanto asignemos un empleado recibira la informacion en su correo electronico',
                data,
            });
        }
    } catch (error) {
        next(error);
    }
};

export default newServiceController;
