import replaceServiceScheduleTemplatesService from '../../services/schedules/replaceServiceScheduleTemplatesService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const replaceServiceScheduleTemplatesController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month, templates } = req.body;
        const { id: userId, role } = req.userLogged;

        if (!month) {
            generateErrorUtil('El mes es obligatorio', 400);
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await replaceServiceScheduleTemplatesService(
            serviceId,
            month,
            templates,
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

export default replaceServiceScheduleTemplatesController;
