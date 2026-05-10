import approveEmployeeRequestService from '../../services/employeeRequests/approveEmployeeRequestService.js';
import selectEmployeeScheduledServiceIdsInRangeService from '../../services/schedules/selectEmployeeScheduledServiceIdsInRangeService.js';
import { getIO } from '../../sockets/io.js';
import { emitServiceSchedulesChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const approveEmployeeRequestController = async (req, res, next) => {
    try {
        const data = await approveEmployeeRequestService({
            requestId: req.params.id,
            adminId: req.userLogged.id,
            decisionNotes: req.body.decisionNotes,
        });

        getIO()
            ?.to(`user:${data.employeeId}`)
            .emit('employeeRequest:approved', data);

        if (data.absenceId) {
            const affectedServiceIds =
                await selectEmployeeScheduledServiceIdsInRangeService(
                    data.employeeId,
                    data.startDate,
                    data.endDate
                );

            emitServiceSchedulesChanged(affectedServiceIds, {
                changedBy: req.userLogged.id,
                reason: 'employee_request_absence_approved',
                message: 'Peticion aprobada y cuadrante actualizado',
            });
        }

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default approveEmployeeRequestController;
