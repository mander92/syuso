import getPool from '../../db/getPool.js';
import selectHolidayAffectedServiceIdsService from '../../services/holidays/selectHolidayAffectedServiceIdsService.js';
import recalculateAgreementScheduleShiftsService from '../../services/schedules/recalculateAgreementScheduleShiftsService.js';
import { emitServiceSchedulesChanged } from '../../utils/serviceScheduleNotificationUtil.js';

const deleteHolidayController = async (req, res, next) => {
    try {
        const { holidayId } = req.params;
        const pool = await getPool();

        const [rows] = await pool.query(
            `
            SELECT holidayDate, scope, autonomousCommunity, province, city
            FROM holidays
            WHERE id = ? AND deletedAt IS NULL
            `,
            [holidayId]
        );

        await pool.query(
            'UPDATE holidays SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL',
            [holidayId]
        );

        if (rows[0]?.holidayDate) {
            const affectedServiceIds = await recalculateAgreementScheduleShiftsService(
                pool,
                {
                    fromDate: rows[0].holidayDate,
                    toDate: rows[0].holidayDate,
                }
            );
            const holidayServiceIds = await selectHolidayAffectedServiceIdsService(
                pool,
                rows[0]
            );

            emitServiceSchedulesChanged(
                [...affectedServiceIds, ...holidayServiceIds],
                {
                    changedBy: req.userLogged?.id,
                    reason: 'holiday_deleted',
                    message: 'Festivo eliminado',
                }
            );
        }

        res.send({ status: 'ok', message: 'Festivo eliminado' });
    } catch (error) {
        next(error);
    }
};

export default deleteHolidayController;
