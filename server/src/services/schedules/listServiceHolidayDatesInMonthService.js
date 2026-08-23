import getPool from '../../db/getPool.js';
import {
    normalizeHolidayLocation,
    resolveAutonomousCommunity,
} from '../../utils/agreementHoursUtil.js';

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(
            value.getUTCDate()
        )}`;
    }
    return String(value).slice(0, 10);
};

const getMonthBounds = (month) => {
    const [year, monthValue] = String(month || '').split('-').map(Number);
    const startDate = `${year}-${pad(monthValue)}-01`;
    const endDate = new Date(Date.UTC(year, monthValue, 0))
        .toISOString()
        .slice(0, 10);
    return { startDate, endDate };
};

const listServiceHolidayDatesInMonthService = async (serviceIds = [], month) => {
    const ids = [...new Set(serviceIds.filter(Boolean))];
    if (!ids.length || !month) return [];

    const { startDate, endDate } = getMonthBounds(month);
    const pool = await getPool();
    const [services] = await pool.query(
        `
        SELECT s.id, s.autonomousCommunity, s.province, a.city
        FROM services s
        INNER JOIN addresses a ON a.id = s.addressId
        WHERE s.id IN (?)
        `,
        [ids]
    );

    const dateSet = new Set();

    for (const service of services) {
        const autonomousCommunity = resolveAutonomousCommunity(
            service.province,
            service.autonomousCommunity
        );
        const normalized = normalizeHolidayLocation({
            autonomousCommunity,
            province: service.province,
            city: service.city,
        });

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
                startDate,
                endDate,
                normalized.autonomousCommunity,
                normalized.city,
                normalized.province,
            ]
        );

        rows.forEach((row) => {
            const dateKey = toDateKey(row.holidayDate);
            if (dateKey) dateSet.add(dateKey);
        });
    }

    return [...dateSet].sort();
};

export default listServiceHolidayDatesInMonthService;
