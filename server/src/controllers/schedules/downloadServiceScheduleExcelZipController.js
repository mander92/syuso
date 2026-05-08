import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridExcelUtil } from '../../utils/scheduleExcelUtil.js';
import {
    buildServiceScheduleSection,
    getServiceScheduleFileBaseName,
} from '../../utils/scheduleExportUtil.js';

const downloadServiceScheduleExcelZipController = async (req, res, next) => {
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
        res.attachment(`schedules-excel-${effectiveMonth}.zip`);
        archive.pipe(res);

        for (const serviceId of ids) {
            await ensureServiceDelegationAccessService(serviceId, userId, role);
            const service = await selectServiceByIdService(serviceId);
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

            archive.append(fs.createReadStream(filePath), {
                name: path.basename(filePath),
            });
        }

        await archive.finalize();
    } catch (error) {
        next(error);
    }
};

export default downloadServiceScheduleExcelZipController;
