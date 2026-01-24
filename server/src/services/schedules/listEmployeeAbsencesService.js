import getPool from '../../db/getPool.js';

const listEmployeeAbsencesService = async (employeeId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, employeeId, startDate, endDate, type, notes
        FROM employeeAbsences
        WHERE employeeId = ?
        ORDER BY startDate DESC
        `,
        [employeeId]
    );

    return rows;
};

export default listEmployeeAbsencesService;
