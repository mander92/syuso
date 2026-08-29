import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { saveServiceScheduleSnapshot } from './serviceScheduleSnapshotService.js';

const deleteServiceScheduleMonthService = async (serviceId, month) => {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
        generateErrorUtil('Mes de cuadrante no valido', 400);
    }

    const pool = await getPool();
    const [result] = await pool.query(
        `
        UPDATE serviceScheduleShifts
        SET deletedAt = CURRENT_TIMESTAMP
        WHERE serviceId = ?
          AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?
          AND deletedAt IS NULL
        `,
        [serviceId, month]
    );

    await saveServiceScheduleSnapshot(pool, serviceId, month);

    return {
        serviceId,
        month,
        deletedCount: result.affectedRows || 0,
    };
};

export default deleteServiceScheduleMonthService;
