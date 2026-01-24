import getPool from '../../db/getPool.js';

const isTimeBetween = (time, startTime, endTime) => {
    if (endTime >= startTime) {
        return time >= startTime && time <= endTime;
    }
    return time >= startTime || time <= endTime;
};

const selectScheduledShiftForClockInService = async (
    serviceId,
    employeeId,
    localDate,
    localTime
) => {
    const pool = await getPool();

    const previousDate = new Date(`${localDate}T00:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    const prevDateString = previousDate.toISOString().slice(0, 10);

    const [rows] = await pool.query(
        `
        SELECT id, scheduleDate, startTime, endTime
        FROM serviceScheduleShifts
        WHERE serviceId = ?
          AND employeeId = ?
          AND status = 'scheduled'
          AND deletedAt IS NULL
          AND scheduleDate IN (?, ?)
        `,
        [serviceId, employeeId, localDate, prevDateString]
    );

    if (!rows.length) return null;

    const matching = rows.find((row) => {
        const rowDate =
            typeof row.scheduleDate === 'string'
                ? row.scheduleDate
                : row.scheduleDate.toISOString().slice(0, 10);

        if (rowDate === localDate) {
            return isTimeBetween(localTime, row.startTime, row.endTime);
        }

        if (rowDate === prevDateString) {
            return row.endTime < row.startTime && localTime <= row.endTime;
        }

        return false;
    });

    return matching || null;
};

export default selectScheduledShiftForClockInService;
