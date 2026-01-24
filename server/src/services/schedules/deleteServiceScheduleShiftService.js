import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteServiceScheduleShiftService = async (shiftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id
        FROM serviceScheduleShifts
        WHERE id = ? AND deletedAt IS NULL
        `,
        [shiftId]
    );

    if (!rows.length) {
        generateErrorUtil('Turno no encontrado', 404);
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
