import applyServiceScheduleSimulationService from '../../services/schedules/applyServiceScheduleSimulationService.js';

const applyServiceScheduleSimulationController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month, shifts } = req.body || {};
        const data = await applyServiceScheduleSimulationService(
            serviceId,
            month,
            shifts
        );
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default applyServiceScheduleSimulationController;
