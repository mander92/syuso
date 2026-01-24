import listEmployeeScheduleShiftsService from '../../services/schedules/listEmployeeScheduleShiftsService.js';

const listEmployeeScheduleShiftsController = async (req, res, next) => {
    try {
        const { month, generateExcel, serviceId } = req.query;
        const { id: userId } = req.userLogged;

        const data = await listEmployeeScheduleShiftsService(
            userId,
            month,
            generateExcel === '1',
            serviceId
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listEmployeeScheduleShiftsController;
