import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';

const replaceServiceScheduleTemplatesService = async (
    serviceId,
    month,
    templates,
    createdBy
) => {
    const pool = await getPool();

    await pool.query(
        `
        DELETE FROM serviceScheduleTemplates
        WHERE serviceId = ? AND (month = ? OR month = '')
        `,
        [serviceId, month]
    );

    if (!Array.isArray(templates) || templates.length === 0) {
        return [];
    }

    const values = templates.map((item) => [
        uuid(),
        serviceId,
        '',
        item.shiftTypeId || null,
        item.weekday,
        item.startTime,
        item.endTime,
        item.slots,
        createdBy,
    ]);

    await pool.query(
        `
        INSERT INTO serviceScheduleTemplates
            (id, serviceId, month, shiftTypeId, weekday, startTime, endTime, slots, createdBy)
        VALUES ?
        `,
        [values]
    );

    return values.map(
        ([id, , templateMonth, shiftTypeId, weekday, startTime, endTime, slots]) => ({
            id,
            serviceId,
            month: templateMonth,
            shiftTypeId,
            weekday,
            startTime,
            endTime,
            slots,
        })
    );
};

export default replaceServiceScheduleTemplatesService;
