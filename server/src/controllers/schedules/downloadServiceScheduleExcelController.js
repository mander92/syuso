import path from 'path';
import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridExcelUtil } from '../../utils/scheduleExcelUtil.js';
import {
    buildServiceScheduleSection,
    getServiceScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadServiceScheduleExcelController = async (req, res, next) => {
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

        const filePath = await createScheduleGridExcelUtil({
            sections: [
                buildServiceScheduleSection({
                    service,
                    shifts,
                    month: effectiveMonth,
                }),
            ],
            fileName: `${getServiceScheduleFileBaseName(
                service,
                serviceId,
                effectiveMonth
            )}.xlsx`,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadServiceScheduleExcelController;
