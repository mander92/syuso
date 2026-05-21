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
                type,
                description,
                province,
                autonomousCommunity,
                hourRuleType,
                image,
                startDateTime,
                endDateTime,
                hours,
                hourlyRate,
                numberOfPeople,
                comments,
                address,
                city,
                postCode,
                clientId,
                name,
            } = req.body;

            let legacyTypeOfService = null;
            if (typeOfServiceId) {
                legacyTypeOfService =
                    await selectTypeOfServiceByIdService(typeOfServiceId);
            }

            if (role === 'admin') {
                const delegations =
                    await selectAdminDelegationNamesService(req.userLogged.id);
                const serviceProvince = province || legacyTypeOfService?.city;

                if (
                    !delegations.length ||
                    !delegations.includes(serviceProvince)
                ) {
                    generateErrorUtil('Acceso denegado', 403);
                }
            }

            const data = await insertServiceAdmin(
                typeOfServiceId,
                startDateTime,
                endDateTime,
                hours || 1,
                hourlyRate,
                numberOfPeople || 1,
                comments,
                address,
                city,
                postCode,
                clientId || req.userLogged.id,
                name,
                {
                    type: type || legacyTypeOfService?.type,
                    description: description || legacyTypeOfService?.description,
                    province: province || legacyTypeOfService?.city,
                    autonomousCommunity,
                    hourRuleType,
                    image: image || legacyTypeOfService?.image,
                    typeOfServiceId: typeOfServiceId || null,
                }
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
                type,
                description,
                province,
                autonomousCommunity,
                hourRuleType,
                image,
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

            const legacyTypeOfService = typeOfServiceId
                ? await selectTypeOfServiceByIdService(typeOfServiceId)
                : null;

            const data = await insertServiceService(
                typeOfServiceId || null,
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
                {
                    type: type || legacyTypeOfService?.type,
                    description: description || legacyTypeOfService?.description,
                    province: province || legacyTypeOfService?.city,
                    autonomousCommunity,
                    hourRuleType,
                    image: image || legacyTypeOfService?.image,
                }
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
