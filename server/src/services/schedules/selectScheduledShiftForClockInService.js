import getPool from '../../db/getPool.js';
import { toMadridDateString } from '../../utils/scheduleTimeUtil.js';

const toSeconds = (value) => {
    const [hours, minutes, seconds = '0'] = String(value).split(':');
    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds)
    );
};

const normalizeDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return toMadridDateString(value);
    }
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const dateTimeToMs = (dateKey, time) => {
    const [year, month, day] = String(dateKey).split('-').map(Number);
    const [hours, minutes, seconds = '0'] = String(time).split(':').map(Number);
    if (
        [year, month, day, hours, minutes, seconds].some((value) =>
            Number.isNaN(value)
        )
    ) {
        return null;
    }
    return Date.UTC(year, month - 1, day, hours, minutes, seconds);
};

const selectScheduledShiftForClockInService = async (
    serviceId,
    employeeId,
    localDate,
    localTime,
    clockInEarlyMinutes = 15
) => {
    const pool = await getPool();

    const previousDate = new Date(`${localDate}T00:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    const prevDateString = previousDate.toISOString().slice(0, 10);
    const nextDate = new Date(`${localDate}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateString = nextDate.toISOString().slice(0, 10);

    const [rows] = await pool.query(
        `
        SELECT id, scheduleDate, startTime, endTime
        FROM serviceScheduleShifts
        WHERE serviceId = ?
          AND employeeId = ?
          AND status = 'scheduled'
          AND deletedAt IS NULL
          AND scheduleDate IN (?, ?, ?)
        `,
        [serviceId, employeeId, localDate, prevDateString, nextDateString]
    );

    if (!rows.length) return null;

    const currentMs = dateTimeToMs(localDate, localTime);
    if (currentMs == null) return null;

    const earlyMinutes =
        Number.isFinite(clockInEarlyMinutes) && clockInEarlyMinutes >= 0
            ? clockInEarlyMinutes
            : 15;

    const matching = rows.find((row) => {
        const rowDate = normalizeDateKey(row.scheduleDate);
        const startMs = dateTimeToMs(rowDate, row.startTime);
        const endBaseMs = dateTimeToMs(rowDate, row.endTime);
        if (startMs == null || endBaseMs == null) return false;

        const endMs =
            toSeconds(row.endTime) <= toSeconds(row.startTime)
                ? endBaseMs + 24 * 60 * 60 * 1000
                : endBaseMs;
        const windowStartMs = startMs - earlyMinutes * 60 * 1000;

        return currentMs >= windowStartMs && currentMs <= endMs;
    });

    return matching || null;
};

export default selectScheduledShiftForClockInService;
