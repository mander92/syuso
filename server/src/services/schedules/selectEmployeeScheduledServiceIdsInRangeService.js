import getPool from '../../db/getPool.js';

const selectEmployeeScheduledServiceIdsInRangeService = async (
    employeeId,
    startDate,
    endDate
) => {
    if (!employeeId || !startDate || !endDate) return [];

    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT DISTINCT serviceId
        FROM serviceScheduleShifts
        WHERE employeeId = ?
          AND deletedAt IS NULL
          AND status = 'scheduled'
          AND scheduleDate BETWEEN ? AND ?
        `,
        [employeeId, startDate, endDate]
    );

    return rows.map((row) => row.serviceId).filter(Boolean);
};

export default selectEmployeeScheduledServiceIdsInRangeService;
