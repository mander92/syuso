import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

const buildDateString = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekdayNumber = (date) => {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
};

const applyServiceScheduleTemplateService = async (
    serviceId,
    month,
    startDate,
    createdBy
) => {
    const pool = await getPool();

    const [templates] = await pool.query(
        `
        SELECT weekday, startTime, endTime, slots, shiftTypeId
        FROM serviceScheduleTemplates
        WHERE serviceId = ? AND month = ?
        `,
        [serviceId, month]
    );

    if (!templates.length) return [];

    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNumber, 0));

    const effectiveStartDate = startDate
        ? new Date(`${startDate}T00:00:00Z`)
        : monthStart;

    await pool.query(
        `
        DELETE FROM serviceScheduleShifts
        WHERE serviceId = ?
          AND deletedAt IS NULL
          AND status = 'scheduled'
          AND scheduleDate >= ?
          AND scheduleDate <= ?
        `,
        [
            serviceId,
            buildDateString(effectiveStartDate),
            buildDateString(monthEnd),
        ]
    );

    const values = [];

    for (
        let current = new Date(monthStart);
        current <= monthEnd;
        current.setUTCDate(current.getUTCDate() + 1)
    ) {
        if (current < effectiveStartDate) continue;

        const weekday = getWeekdayNumber(current);
        const dayTemplates = templates.filter(
            (template) => template.weekday === weekday
        );

        if (!dayTemplates.length) continue;

        const scheduleDate = buildDateString(current);

        dayTemplates.forEach((template) => {
            const slots = Number(template.slots) || 1;
            const hours = calculateShiftHours(
                template.startTime,
                template.endTime
            );

            for (let i = 0; i < slots; i += 1) {
                values.push([
                    uuid(),
                    serviceId,
                    null,
                    template.shiftTypeId || null,
                    scheduleDate,
                    template.startTime,
                    template.endTime,
                    hours,
                    'scheduled',
                    createdBy,
                ]);
            }
        });
    }

    if (!values.length) return [];

    await pool.query(
        `
        INSERT INTO serviceScheduleShifts
            (id, serviceId, employeeId, shiftTypeId, scheduleDate, startTime, endTime, hours, status, createdBy)
        VALUES ?
        `,
        [values]
    );

    return values.map(
        ([
            id,
            serviceIdValue,
            employeeId,
            shiftTypeId,
            scheduleDate,
            startTime,
            endTime,
            hours,
        ]) => ({
            id,
            serviceId: serviceIdValue,
            employeeId,
            shiftTypeId,
            scheduleDate,
            startTime,
            endTime,
            hours,
        })
    );
};

export default applyServiceScheduleTemplateService;
