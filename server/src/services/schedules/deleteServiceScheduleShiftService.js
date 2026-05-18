import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteServiceScheduleShiftService = async (shiftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, deletedAt
        FROM serviceScheduleShifts
        WHERE id = ?
        `,
        [shiftId]
    );

    if (!rows.length) {
        generateErrorUtil('Turno no encontrado', 404);
    }

    if (rows[0].deletedAt) {
        return true;
    }

    await pool.query(
        `
        UPDATE serviceScheduleShifts
        SET deletedAt = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [shiftId]
    );

    return true;
};

export default deleteServiceScheduleShiftService;
