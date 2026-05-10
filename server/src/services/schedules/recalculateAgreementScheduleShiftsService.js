import { calculateShiftHourBreakdowns } from './calculateShiftHourBreakdownsService.js';

const recalculateAgreementScheduleShiftsService = async (
    pool,
    { fromDate = null, toDate = null } = {}
) => {
    const filters = [
        "s.hourRuleType = 'convenio'",
        'ss.deletedAt IS NULL',
        's.deletedAt IS NULL',
    ];
    const values = [];

    if (fromDate) {
        filters.push('ss.scheduleDate >= DATE_SUB(?, INTERVAL 1 DAY)');
        values.push(fromDate);
    }
    if (toDate) {
        filters.push('ss.scheduleDate <= ?');
        values.push(toDate);
    }

    const [rows] = await pool.query(
        `
        SELECT ss.id, ss.serviceId, ss.scheduleDate, ss.startTime, ss.endTime
        FROM serviceScheduleShifts ss
        INNER JOIN services s ON s.id = ss.serviceId
        WHERE ${filters.join(' AND ')}
        ORDER BY ss.serviceId, ss.scheduleDate
        `,
        values
    );

    const byService = new Map();
    rows.forEach((row) => {
        if (!byService.has(row.serviceId)) byService.set(row.serviceId, []);
        byService.get(row.serviceId).push(row);
    });

    for (const [serviceId, shifts] of byService.entries()) {
        const breakdowns = await calculateShiftHourBreakdowns(
            pool,
            serviceId,
            shifts
        );

        for (let index = 0; index < shifts.length; index += 1) {
            const breakdown = breakdowns[index];
            await pool.query(
                `
                UPDATE serviceScheduleShifts
                SET hours = ?,
                    realHours = ?,
                    nightHours = ?,
                    holidayHours = ?,
                    regularHours = ?
                WHERE id = ?
                `,
                [
                    breakdown.hours,
                    breakdown.realHours,
                    breakdown.nightHours,
                    breakdown.holidayHours,
                    breakdown.regularHours,
                    shifts[index].id,
                ]
            );
        }
    }

    return [...byService.keys()];
};

export default recalculateAgreementScheduleShiftsService;
