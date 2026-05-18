import path from 'path';
import listEmployeeScheduleShiftsService from '../../services/schedules/listEmployeeScheduleShiftsService.js';
import selectUserByIdService from '../../services/users/selectUserByIdService.js';
import { createScheduleGridExcelUtil } from '../../utils/scheduleExcelUtil.js';
import {
    buildEmployeeScheduleSection,
    getEmployeeScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadEmployeeScheduleExcelController = async (req, res, next) => {
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

        const filePath = await createScheduleGridExcelUtil({
            sections: [
                buildEmployeeScheduleSection({
                    employee,
                    shifts,
                    month: effectiveMonth,
                }),
            ],
            fileName: `${getEmployeeScheduleFileBaseName(
                employee,
                employeeId,
                effectiveMonth
            )}.xlsx`,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadEmployeeScheduleExcelController;
