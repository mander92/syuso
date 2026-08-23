import path from 'path';
import listEmployeeScheduleShiftsService from '../../services/schedules/listEmployeeScheduleShiftsService.js';
import listEmployeeAbsencesInMonthService from '../../services/schedules/listEmployeeAbsencesInMonthService.js';
import selectUserByIdService from '../../services/users/selectUserByIdService.js';
import { createScheduleGridPdfUtil } from '../../utils/schedulePdfUtil.js';
import {
    buildEmployeeScheduleSection,
    getEmployeeScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadEmployeeSchedulePdfController = async (req, res, next) => {
    try {
        const { employeeId: employeeIdParam, month, serviceId } = req.query;
        const { id: userId, role } = req.userLogged;

        const employeeId =
            role === 'employee' ? userId : employeeIdParam || userId;

        const employee = await selectUserByIdService(employeeId);
        const effectiveMonth = month || new Date().toISOString().slice(0, 7);
        const shifts = await listEmployeeScheduleShiftsService(
            employeeId,
            effectiveMonth,
            false,
            serviceId || null
        );
        const absences = await listEmployeeAbsencesInMonthService(
            [employeeId],
            effectiveMonth
        );

        const fileName = `${getEmployeeScheduleFileBaseName(
            employee,
            employeeId,
            effectiveMonth
        )}.pdf`;
        const filePath = await createScheduleGridPdfUtil({
            sections: [
                buildEmployeeScheduleSection({
                    employee,
                    shifts,
                    month: effectiveMonth,
                    absences,
                }),
            ],
            fileName,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadEmployeeSchedulePdfController;
