import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import updateServiceScheduleImageService from '../../services/services/updateServiceScheduleImageService.js';
import { deleteScheduleImageUtil, saveScheduleImageUtil } from '../../utils/scheduleImageUtil.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const updateServiceScheduleImageController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        if (!req.files || !req.files.image) {
            generateErrorUtil('Debes seleccionar un PNG', 400);
        }

        const service = await selectServiceByIdService(serviceId);

        if (service?.[0]?.scheduleImage) {
            await deleteScheduleImageUtil(service[0].scheduleImage);
        }

        const scheduleImage = await saveScheduleImageUtil(req.files.image);

        await updateServiceScheduleImageService(serviceId, scheduleImage);

        res.send({
            status: 'ok',
            message: 'Cuadrante actualizado',
            data: {
                scheduleImage,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default updateServiceScheduleImageController;
