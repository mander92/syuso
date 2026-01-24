import deleteEmployeeAbsenceService from '../../services/schedules/deleteEmployeeAbsenceService.js';

const deleteEmployeeAbsenceController = async (req, res, next) => {
    try {
        const { userId, absenceId } = req.params;

        await deleteEmployeeAbsenceService(absenceId, userId);

        res.send({
            status: 'ok',
            message: 'Ausencia eliminada',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteEmployeeAbsenceController;
