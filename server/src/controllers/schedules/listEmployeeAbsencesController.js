import listEmployeeAbsencesService from '../../services/schedules/listEmployeeAbsencesService.js';

const listEmployeeAbsencesController = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const data = await listEmployeeAbsencesService(userId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listEmployeeAbsencesController;
