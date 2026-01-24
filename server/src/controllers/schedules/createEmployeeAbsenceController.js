import createEmployeeAbsenceService from '../../services/schedules/createEmployeeAbsenceService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createEmployeeAbsenceController = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, type, notes } = req.body;
        const { id: createdBy } = req.userLogged;

        if (!startDate || !endDate || !type) {
            generateErrorUtil('Datos de ausencia incompletos', 400);
        }

        const data = await createEmployeeAbsenceService(
            userId,
            startDate,
            endDate,
            type,
            notes,
            createdBy
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createEmployeeAbsenceController;
