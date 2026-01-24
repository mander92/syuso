import getPool from '../../db/getPool.js';

const upsertEmployeeRulesService = async (
    employeeId,
    minMonthlyHours,
    maxMonthlyHours,
    minRestHours
) => {
    const pool = await getPool();

    const resolvedMin = Number(minMonthlyHours) || 0;
    const resolvedMax = Number(maxMonthlyHours) || 0;
    const resolvedRest = Number(minRestHours) || 0;

    await pool.query(
        `
        INSERT INTO employeeRules (employeeId, minMonthlyHours, maxMonthlyHours, minRestHours)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            minMonthlyHours = VALUES(minMonthlyHours),
            maxMonthlyHours = VALUES(maxMonthlyHours),
            minRestHours = VALUES(minRestHours)
        `,
        [employeeId, resolvedMin, resolvedMax, resolvedRest]
    );

    return {
        employeeId,
        minMonthlyHours: resolvedMin,
        maxMonthlyHours: resolvedMax,
        minRestHours: resolvedRest,
    };
};

export default upsertEmployeeRulesService;
