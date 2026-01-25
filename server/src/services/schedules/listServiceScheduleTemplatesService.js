import getPool from '../../db/getPool.js';

const listServiceScheduleTemplatesService = async (serviceId, month) => {
    const pool = await getPool();

    const [monthRows] = await pool.query(
        `
        SELECT id, serviceId, month, shiftTypeId, weekday, startTime, endTime, slots
        FROM serviceScheduleTemplates
        WHERE serviceId = ? AND month = ?
        ORDER BY weekday, startTime
        `,
        [serviceId, month]
    );

    if (monthRows.length) return monthRows;

    const [defaultRows] = await pool.query(
        `
        SELECT id, serviceId, month, shiftTypeId, weekday, startTime, endTime, slots
        FROM serviceScheduleTemplates
        WHERE serviceId = ? AND month = ''
        ORDER BY weekday, startTime
        `,
        [serviceId]
    );

    return defaultRows;
};

export default listServiceScheduleTemplatesService;
