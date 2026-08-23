import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import listEmployeeAbsencesInMonthService from '../../services/schedules/listEmployeeAbsencesInMonthService.js';
import listServiceHolidayDatesInMonthService from '../../services/schedules/listServiceHolidayDatesInMonthService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridPdfUtil } from '../../utils/schedulePdfUtil.js';
import {
    buildServiceScheduleSection,
    getServiceScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadServiceScheduleZipController = async (req, res, next) => {
    try {
        const { serviceIds, month } = req.query;
        const { id: userId, role } = req.userLogged;

        const ids = serviceIds
            ? serviceIds.split(',').map((id) => id.trim()).filter(Boolean)
            : [];

        const effectiveMonth = month || new Date().toISOString().slice(0, 7);

        if (!ids.length) {
            return res.status(400).send({
                status: 'error',
                message: 'Debes seleccionar al menos un servicio.',
            });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`schedules-${effectiveMonth}.zip`);
        archive.pipe(res);

        for (const serviceId of ids) {
            await ensureServiceDelegationAccessService(serviceId, userId, role);
            const service = await selectServiceByIdService(serviceId);
            const shifts = await listServiceScheduleShiftsService(
                serviceId,
                effectiveMonth
            );
            const serviceRows = Array.isArray(service) ? service : [];
            const employeeIds = [
                ...new Set(
                    [
                        ...serviceRows.map((row) => row.employeeId),
                        ...shifts.map((shift) => shift.employeeId),
                    ].filter(Boolean)
                ),
            ];
            const absences = await listEmployeeAbsencesInMonthService(
                employeeIds,
                effectiveMonth
            );
            const holidayDates = await listServiceHolidayDatesInMonthService(
                [serviceId],
                effectiveMonth
            );

            const filePath = await createScheduleGridPdfUtil({
                sections: [
                    buildServiceScheduleSection({
                        service,
                        shifts,
                        month: effectiveMonth,
                        absences,
                        holidayDates,
                    }),
                ],
                fileName: `${getServiceScheduleFileBaseName(
                    service,
                    serviceId,
                    effectiveMonth
                )}.pdf`,
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

export default downloadServiceScheduleZipController;
