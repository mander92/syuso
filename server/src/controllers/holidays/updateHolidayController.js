import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import recalculateAgreementScheduleShiftsService from '../../services/schedules/recalculateAgreementScheduleShiftsService.js';

const VALID_SCOPES = new Set(['national', 'autonomous', 'local']);

const updateHolidayController = async (req, res, next) => {
    try {
        const { holidayId } = req.params;
        const {
            holidayDate,
            name,
            scope,
            autonomousCommunity,
            province,
            city,
        } = req.body;
        const pool = await getPool();

        const [rows] = await pool.query(
            'SELECT * FROM holidays WHERE id = ? AND deletedAt IS NULL',
            [holidayId]
        );
        if (!rows.length) generateErrorUtil('Festivo no encontrado', 404);

        const current = rows[0];
        const resolvedScope = scope || current.scope;
        if (!VALID_SCOPES.has(resolvedScope)) {
            generateErrorUtil('Alcance de festivo no valido', 400);
        }

        const resolvedHolidayDate = holidayDate || current.holidayDate;

        await pool.query(
            `
            UPDATE holidays
            SET holidayDate = ?,
                name = ?,
                scope = ?,
                autonomousCommunity = ?,
                province = ?,
                city = ?
            WHERE id = ?
            `,
            [
                resolvedHolidayDate,
                name !== undefined ? String(name).trim() : current.name,
                resolvedScope,
                autonomousCommunity !== undefined
                    ? autonomousCommunity || null
                    : current.autonomousCommunity,
                province !== undefined ? province || null : current.province,
                city !== undefined ? city || null : current.city,
                holidayId,
            ]
        );

        const affectedDates = [current.holidayDate, resolvedHolidayDate]
            .filter(Boolean)
            .map((date) =>
                date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
            )
            .sort();
        await recalculateAgreementScheduleShiftsService(pool, {
            fromDate: affectedDates[0],
            toDate: affectedDates[affectedDates.length - 1],
        });

        res.send({ status: 'ok', message: 'Festivo actualizado' });
    } catch (error) {
        next(error);
    }
};

export default updateHolidayController;
