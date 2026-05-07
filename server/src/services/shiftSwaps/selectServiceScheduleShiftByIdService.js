import getPool from '../../db/getPool.js';

const selectServiceScheduleShiftByIdService = async (shiftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            ss.id,
            ss.serviceId,
            ss.employeeId,
            ss.shiftTypeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            ss.hours,
            ss.status,
            ss.createdAt,
            ss.modifiedAt,
            ss.deletedAt,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor
        FROM serviceScheduleShifts ss
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.id = ?
          AND ss.deletedAt IS NULL
        `,
        [shiftId]
    );

    return rows[0] || null;
};

export default selectServiceScheduleShiftByIdService;
