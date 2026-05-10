import getPool from '../../db/getPool.js';
import recalculateAgreementScheduleShiftsService from '../../services/schedules/recalculateAgreementScheduleShiftsService.js';

const deleteHolidayController = async (req, res, next) => {
    try {
        const { holidayId } = req.params;
        const pool = await getPool();

        const [rows] = await pool.query(
            'SELECT holidayDate FROM holidays WHERE id = ? AND deletedAt IS NULL',
            [holidayId]
        );

        await pool.query(
            'UPDATE holidays SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL',
            [holidayId]
        );

        if (rows[0]?.holidayDate) {
            await recalculateAgreementScheduleShiftsService(pool, {
                fromDate: rows[0].holidayDate,
                toDate: rows[0].holidayDate,
            });
        }

        res.send({ status: 'ok', message: 'Festivo eliminado' });
    } catch (error) {
        next(error);
    }
};

export default deleteHolidayController;
