import getPool from '../../db/getPool.js';

const toSeconds = (value) => {
    const [hours, minutes, seconds = '0'] = String(value).split(':');
    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds)
    );
};

const subtractMinutes = (time, minutes) => {
    const total = toSeconds(time) - minutes * 60;
    if (total >= 0) return total;
    return 24 * 3600 + total;
};

const secondsToTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const isTimeBetween = (time, startTime, endTime) => {
    const timeSec = toSeconds(time);
    const startSec = toSeconds(startTime);
    const endSec = toSeconds(endTime);

    if (endSec >= startSec) {
        return timeSec >= startSec && timeSec <= endSec;
    }
    return timeSec >= startSec || timeSec <= endSec;
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
            const earlyMinutes =
                Number.isFinite(clockInEarlyMinutes) && clockInEarlyMinutes >= 0
                    ? clockInEarlyMinutes
                    : 15;
            const startWindowSec = subtractMinutes(row.startTime, earlyMinutes);
            const windowString = secondsToTime(startWindowSec);

            return isTimeBetween(localTime, windowString, row.endTime);
        }

        if (rowDate === prevDateString) {
            return row.endTime < row.startTime && localTime <= row.endTime;
        }

        return false;
    });

    return matching || null;
};

export default selectScheduledShiftForClockInService;
