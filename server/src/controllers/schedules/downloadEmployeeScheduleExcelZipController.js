import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import listEmployeeScheduleShiftsService from '../../services/schedules/listEmployeeScheduleShiftsService.js';
import selectUserByIdService from '../../services/users/selectUserByIdService.js';
import { createScheduleGridExcelUtil } from '../../utils/scheduleExcelUtil.js';
import {
    buildEmployeeScheduleSection,
    getEmployeeScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadEmployeeScheduleExcelZipController = async (req, res, next) => {
    try {
        const { employeeIds, month, serviceId } = req.query;
        const { id: userId, role } = req.userLogged;

        const ids =
            role === 'employee'
                ? [userId]
                : employeeIds
                      ?.split(',')
                      .map((id) => id.trim())
                      .filter(Boolean) || [];

        const effectiveMonth = month || new Date().toISOString().slice(0, 7);

        if (!ids.length) {
            return res.status(400).send({
                status: 'error',
                message: 'Debes seleccionar al menos un empleado.',
            });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`cuadrantes-personales-excel-${effectiveMonth}.zip`);
        archive.pipe(res);

        for (const employeeId of ids) {
            const employee = await selectUserByIdService(employeeId);
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

            archive.append(fs.createReadStream(filePath), {
                name: path.basename(filePath),
            });
        }

        await archive.finalize();
    } catch (error) {
        next(error);
    }
};

export default downloadEmployeeScheduleExcelZipController;
