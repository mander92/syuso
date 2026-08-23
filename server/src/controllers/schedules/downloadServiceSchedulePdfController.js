import path from 'path';
import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import listEmployeeAbsencesInMonthService from '../../services/schedules/listEmployeeAbsencesInMonthService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridPdfUtil } from '../../utils/schedulePdfUtil.js';
import {
    buildServiceScheduleSection,
    getServiceScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadServiceSchedulePdfController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month } = req.query;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const service = await selectServiceByIdService(serviceId);
        const effectiveMonth = month || new Date().toISOString().slice(0, 7);
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

        const section = buildServiceScheduleSection({
            service,
            shifts,
            month: effectiveMonth,
            absences,
        });
        const fileName = `${getServiceScheduleFileBaseName(
            service,
            serviceId,
            effectiveMonth
        )}.pdf`;
        const filePath = await createScheduleGridPdfUtil({
            sections: [section],
            fileName,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadServiceSchedulePdfController;
