import generateErrorUtil from '../../utils/generateErrorUtil.js';
import newAssingPersonToServiceService from '../../services/personAssigned/newAssingPersonToServiceService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import { createAcknowledgementService } from '../../services/acknowledgements/acknowledgementService.js';
import { sendPushNotificationToUserService } from '../../services/push/sendPushNotificationService.js';

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
        await createAcknowledgementService({
            subjectType: 'service_assignment',
            subjectId: serviceId,
            title: 'Servicio asignado',
            message:
                'Se te ha asignado un nuevo servicio. Revisa los detalles en la app.',
            url: '/account',
            recipientUserIds: [employeeId],
            createdBy: userId,
            push: false,
        });

        void sendPushNotificationToUserService(employeeId, {
            title: 'Servicio asignado',
            body: 'Se te ha asignado un nuevo servicio. Revisa los detalles en la app.',
            url: '/account',
            tag: `service-assigned-${serviceId}`,
        }).catch((error) => {
            console.error('[push] service assignment notification failed', {
                serviceId,
                employeeId,
                message: error.message,
            });
        });

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
