import getPool from '../../db/getPool.js';

const selectEmployeeAbsenceForDateService = async (employeeId, date) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, type
        FROM employeeAbsences
        WHERE employeeId = ?
          AND startDate <= ?
          AND endDate >= ?
        LIMIT 1
        `,
        [employeeId, date, date]
    );

    return rows[0] || null;
};

export default selectEmployeeAbsenceForDateService;
