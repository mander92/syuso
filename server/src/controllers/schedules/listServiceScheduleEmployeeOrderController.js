import { listServiceScheduleEmployeeOrderService } from '../../services/schedules/serviceScheduleEmployeeOrderService.js';

const listServiceScheduleEmployeeOrderController = async (req, res, next) => {
    try {
        const data = await listServiceScheduleEmployeeOrderService(
            req.params.serviceId
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceScheduleEmployeeOrderController;
