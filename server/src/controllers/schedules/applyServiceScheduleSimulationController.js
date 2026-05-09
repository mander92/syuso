import applyServiceScheduleSimulationService from '../../services/schedules/applyServiceScheduleSimulationService.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const applyServiceScheduleSimulationController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month, shifts } = req.body || {};
        const { id: userId } = req.userLogged;
        const data = await applyServiceScheduleSimulationService(
            serviceId,
            month,
            shifts
        );

        emitServiceScheduleChanged(serviceId, {
            changedBy: userId,
            reason: 'simulation_applied',
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default applyServiceScheduleSimulationController;
