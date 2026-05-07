import getPool from '../../db/getPool.js';

const selectServiceScheduleShiftByIdService = async (shiftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            id,
            serviceId,
            employeeId,
            startDateTime,
            endDateTime,
            createdAt,
            modifiedAt,
            deletedAt
        FROM serviceScheduleShifts
        WHERE id = ?
        `,
        [shiftId]
    );

    return rows[0] || null;
};

export default selectServiceScheduleShiftByIdService;
