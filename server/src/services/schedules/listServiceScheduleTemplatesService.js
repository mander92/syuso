import getPool from '../../db/getPool.js';

const listServiceScheduleTemplatesService = async (serviceId, month) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, serviceId, month, shiftTypeId, weekday, startTime, endTime, slots
        FROM serviceScheduleTemplates
        WHERE serviceId = ? AND month = ?
        ORDER BY weekday, startTime
        `,
        [serviceId, month]
    );

    return rows;
};

export default listServiceScheduleTemplatesService;
