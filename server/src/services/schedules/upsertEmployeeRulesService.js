import getPool from '../../db/getPool.js';

const upsertEmployeeRulesService = async (
    employeeId,
    minMonthlyHours,
    maxMonthlyHours,
    minRestHours,
    restWeekendType,
    restWeekendCount
) => {
    const pool = await getPool();

    const resolvedMin = Number(minMonthlyHours) || 0;
    const resolvedMax = Number(maxMonthlyHours) || 0;
    const resolvedRest = Number(minRestHours) || 0;
    const resolvedWeekend =
        restWeekendType === 'long' || restWeekendType === 'short'
            ? restWeekendType
            : 'short';
    const resolvedWeekendCount = Number(restWeekendCount) || 0;

    await pool.query(
        `
        INSERT INTO employeeRules (employeeId, minMonthlyHours, maxMonthlyHours, minRestHours, restWeekendType, restWeekendCount)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            minMonthlyHours = VALUES(minMonthlyHours),
            maxMonthlyHours = VALUES(maxMonthlyHours),
            minRestHours = VALUES(minRestHours),
            restWeekendType = VALUES(restWeekendType),
            restWeekendCount = VALUES(restWeekendCount)
        `,
        [
            employeeId,
            resolvedMin,
            resolvedMax,
            resolvedRest,
            resolvedWeekend,
            resolvedWeekendCount,
        ]
    );

    return {
        employeeId,
        minMonthlyHours: resolvedMin,
        maxMonthlyHours: resolvedMax,
        minRestHours: resolvedRest,
        restWeekendType: resolvedWeekend,
        restWeekendCount: resolvedWeekendCount,
    };
};

export default upsertEmployeeRulesService;
