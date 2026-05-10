import deleteEmployeeAbsenceService from '../../services/schedules/deleteEmployeeAbsenceService.js';
import selectEmployeeScheduledServiceIdsInRangeService from '../../services/schedules/selectEmployeeScheduledServiceIdsInRangeService.js';
import { emitServiceSchedulesChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const deleteEmployeeAbsenceController = async (req, res, next) => {
    try {
        const { userId, absenceId } = req.params;

        const deletedAbsence = await deleteEmployeeAbsenceService(absenceId, userId);

        const affectedServiceIds =
            await selectEmployeeScheduledServiceIdsInRangeService(
                userId,
                deletedAbsence.startDate,
                deletedAbsence.endDate
            );

        emitServiceSchedulesChanged(affectedServiceIds, {
            changedBy: req.userLogged?.id,
            reason: 'employee_absence_deleted',
            message: 'Ausencia eliminada del cuadrante',
        });

        res.send({
            status: 'ok',
            message: 'Ausencia eliminada',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteEmployeeAbsenceController;
