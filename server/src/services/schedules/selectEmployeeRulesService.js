import getPool from '../../db/getPool.js';

const selectEmployeeRulesService = async (employeeId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT employeeId, minMonthlyHours, maxMonthlyHours, minRestHours, restWeekendType, restWeekendCount
        FROM employeeRules
        WHERE employeeId = ?
        `,
        [employeeId]
    );

    return rows[0] || {
        employeeId,
        minMonthlyHours: 0,
        maxMonthlyHours: 0,
        minRestHours: 0,
        restWeekendType: 'short',
        restWeekendCount: 0,
    };
};

export default selectEmployeeRulesService;
