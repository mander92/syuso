import listServiceScheduleTemplatesService from '../../services/schedules/listServiceScheduleTemplatesService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const listServiceScheduleTemplatesController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month } = req.query;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const data = await listServiceScheduleTemplatesService(
            serviceId,
            month
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceScheduleTemplatesController;
