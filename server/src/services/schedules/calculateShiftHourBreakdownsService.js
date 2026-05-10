import {
    buildShiftRange,
    calculateAgreementHourBreakdown,
    normalizeHolidayLocation,
    resolveAutonomousCommunity,
} from '../../utils/agreementHoursUtil.js';

const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
};

export const loadServiceHourRuleContext = async (pool, serviceId) => {
    const [rows] = await pool.query(
        `
        SELECT
            s.hourRuleType,
            s.autonomousCommunity,
            s.province,
            a.city
        FROM services s
        INNER JOIN addresses a ON a.id = s.addressId
        WHERE s.id = ?
        `,
        [serviceId]
    );

    const service = rows[0] || {};
    const autonomousCommunity = resolveAutonomousCommunity(
        service.province,
        service.autonomousCommunity
    );

    return {
        hourRuleType: service.hourRuleType || 'standard',
        autonomousCommunity,
        province: service.province || '',
        city: service.city || '',
        normalized: normalizeHolidayLocation({
            autonomousCommunity,
            province: service.province,
            city: service.city,
        }),
    };
};

const loadApplicableHolidayDates = async (pool, context, fromDate, toDate) => {
    if (context.hourRuleType !== 'convenio') return [];

    const [rows] = await pool.query(
        `
        SELECT holidayDate
        FROM holidays
        WHERE deletedAt IS NULL
          AND holidayDate >= ?
          AND holidayDate <= ?
          AND (
              scope = 'national'
              OR (
                  scope = 'autonomous'
                  AND COALESCE(autonomousCommunity, '') COLLATE utf8mb4_0900_ai_ci = ?
              )
              OR (
                  scope = 'local'
                  AND (
                      COALESCE(city, '') COLLATE utf8mb4_0900_ai_ci = ?
                      OR COALESCE(province, '') COLLATE utf8mb4_0900_ai_ci = ?
                  )
              )
          )
        `,
        [
            fromDate,
            toDate,
            context.normalized.autonomousCommunity,
            context.normalized.city,
            context.normalized.province,
        ]
    );

    return rows.map((row) => toDateKey(row.holidayDate));
};

export const calculateShiftHourBreakdowns = async (
    pool,
    serviceId,
    shifts = []
) => {
    const context = await loadServiceHourRuleContext(pool, serviceId);

    if (!Array.isArray(shifts) || !shifts.length) return [];

    const ranges = shifts.map((shift) =>
        buildShiftRange(shift.scheduleDate, shift.startTime, shift.endTime)
    );
    const minTime = Math.min(...ranges.map((range) => range.start.getTime()));
    const maxTime = Math.max(...ranges.map((range) => range.end.getTime()));
    const fromDate = toDateKey(new Date(minTime));
    const toDate = toDateKey(new Date(maxTime));
    const holidayDates = await loadApplicableHolidayDates(
        pool,
        context,
        fromDate,
        toDate
    );

    return shifts.map((shift) =>
        calculateAgreementHourBreakdown({
            scheduleDate: shift.scheduleDate,
            startTime: shift.startTime,
            endTime: shift.endTime,
            hourRuleType: context.hourRuleType,
            holidayDates,
        })
    );
};

export const calculateShiftHourBreakdown = async (pool, serviceId, shift) => {
    const [breakdown] = await calculateShiftHourBreakdowns(pool, serviceId, [
        shift,
    ]);
    return breakdown;
};
