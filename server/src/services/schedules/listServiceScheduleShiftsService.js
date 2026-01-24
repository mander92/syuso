import getPool from '../../db/getPool.js';

const listServiceScheduleShiftsService = async (serviceId, month) => {
    const pool = await getPool();

    const params = [serviceId];
    let monthFilter = '';

    if (month) {
        monthFilter = 'AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?';
        params.push(month);
    }

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
            u.firstName,
            u.lastName,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor
        FROM serviceScheduleShifts ss
        LEFT JOIN users u ON u.id = ss.employeeId
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.serviceId = ?
          AND ss.deletedAt IS NULL
          ${monthFilter}
        ORDER BY ss.scheduleDate DESC, ss.startTime DESC
        `,
        params
    );

    return rows;
};

export default listServiceScheduleShiftsService;
