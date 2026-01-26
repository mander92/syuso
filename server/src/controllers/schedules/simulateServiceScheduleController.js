import simulateServiceScheduleService from '../../services/schedules/simulateServiceScheduleService.js';

const simulateServiceScheduleController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month } = req.body || {};
        const data = await simulateServiceScheduleService(serviceId, month);
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default simulateServiceScheduleController;
