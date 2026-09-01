import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const DEFAULT_SUGGESTION_REST_HOURS = 12;

const toSeconds = (time) => {
    const [hours, minutes, seconds = '0'] = String(time || '').split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const normalizeTime = (value) => {
    const [hours = '00', minutes = '00'] = String(value || '').split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
};

const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
};

const toUtcDateTime = (dateValue, timeValue, addDays = 0) => {
    const [year, month, day] = toDateKey(dateValue).split('-').map(Number);
    const [hours, minutes, seconds = '0'] = String(timeValue || '00:00:00')
        .split(':')
        .map(Number);
    return new Date(
        Date.UTC(year, month - 1, day + addDays, hours, minutes, seconds)
    );
};

const getShiftInterval = (shift) => {
    const start = toUtcDateTime(shift.scheduleDate, shift.startTime);
    const end = toUtcDateTime(
        shift.scheduleDate,
        shift.endTime,
        toSeconds(shift.endTime) <= toSeconds(shift.startTime) ? 1 : 0
    );
    return { start, end };
};

const formatSqlDateTime = (date) =>
    date.toISOString().slice(0, 19).replace('T', ' ');

const isRestCompatible = ({ targetStart, targetEnd, shifts, minRestHours }) => {
    const minRestMs =
        (Number(minRestHours) || DEFAULT_SUGGESTION_REST_HOURS) * 60 * 60 * 1000;

    return shifts.every((shift) => {
        const { start, end } = getShiftInterval(shift);
        const overlaps = start < targetEnd && end > targetStart;
        if (overlaps) return false;

        if (end <= targetStart) {
            return targetStart.getTime() - end.getTime() >= minRestMs;
        }

        if (start >= targetEnd) {
            return start.getTime() - targetEnd.getTime() >= minRestMs;
        }

        return true;
    });
};

const listAvailableScheduleEmployeesService = async ({
    serviceId,
    scheduleDate,
    startTime,
    endTime,
    excludeShiftId = '',
}) => {
    if (!scheduleDate || !startTime || !endTime) {
        generateErrorUtil('Fecha, inicio y fin son obligatorios', 400);
    }

    const pool = await getPool();
    const safeStartTime = normalizeTime(startTime);
    const safeEndTime = normalizeTime(endTime);
    const crossesMidnight = toSeconds(safeEndTime) <= toSeconds(safeStartTime);
    const targetStart = toUtcDateTime(scheduleDate, safeStartTime);
    const targetEnd = toUtcDateTime(
        scheduleDate,
        safeEndTime,
        crossesMidnight ? 1 : 0
    );
    const values = [
        serviceId,
        scheduleDate,
        scheduleDate,
    ];

    let excludeClause = '';
    if (excludeShiftId) {
        excludeClause = 'AND ss.id <> ?';
        values.push(excludeShiftId);
    }

    values.push(
        crossesMidnight ? 1 : 0,
        scheduleDate,
        safeEndTime,
        scheduleDate,
        safeEndTime,
        scheduleDate,
        safeStartTime
    );

    const [rows] = await pool.query(
        `
        SELECT
            u.id,
            u.firstName,
            u.lastName,
            u.email,
            u.dni,
            u.city,
            COALESCE(NULLIF(er.minRestHours, 0), ?) AS minRestHours,
            CASE WHEN pa.employeeId IS NULL THEN 0 ELSE 1 END AS assignedToService
        FROM services targetService
        LEFT JOIN addresses targetAddress ON targetAddress.id = targetService.addressId
        INNER JOIN users u
            ON u.role = 'employee'
           AND u.active = true
           AND u.deletedAt IS NULL
           AND COALESCE(u.city, '') = COALESCE(
               NULLIF(targetService.province, ''),
               targetAddress.city,
               ''
           )
        LEFT JOIN personsAssigned pa
            ON pa.serviceId = targetService.id
           AND pa.employeeId = u.id
        LEFT JOIN employeeRules er
            ON er.employeeId = u.id
        WHERE targetService.id = ?
          AND targetService.deletedAt IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM employeeAbsences ea
              WHERE ea.employeeId = u.id
                AND ea.startDate <= ?
                AND ea.endDate >= ?
          )
          AND NOT EXISTS (
              SELECT 1
              FROM serviceScheduleShifts ss
              WHERE ss.employeeId = u.id
                AND ss.deletedAt IS NULL
                AND ss.status = 'scheduled'
                ${excludeClause}
                AND TIMESTAMP(ss.scheduleDate, ss.startTime) < CASE
                    WHEN ? = 1
                        THEN TIMESTAMP(DATE_ADD(?, INTERVAL 1 DAY), ?)
                    ELSE TIMESTAMP(?, ?)
                END
                AND CASE
                    WHEN ss.endTime <= ss.startTime
                        THEN TIMESTAMP(DATE_ADD(ss.scheduleDate, INTERVAL 1 DAY), ss.endTime)
                    ELSE TIMESTAMP(ss.scheduleDate, ss.endTime)
                END > TIMESTAMP(?, ?)
          )
        ORDER BY assignedToService DESC, u.firstName ASC, u.lastName ASC, u.email ASC
        LIMIT 50
        `,
        [DEFAULT_SUGGESTION_REST_HOURS, ...values]
    );

    if (!rows.length) return [];

    const maxRestHours = Math.max(
        DEFAULT_SUGGESTION_REST_HOURS,
        ...rows.map((row) => Number(row.minRestHours) || 0)
    );
    const windowStart = new Date(
        targetStart.getTime() - maxRestHours * 60 * 60 * 1000
    );
    const windowEnd = new Date(
        targetEnd.getTime() + maxRestHours * 60 * 60 * 1000
    );
    const employeeIds = rows.map((row) => row.id);
    const employeePlaceholders = employeeIds.map(() => '?').join(', ');
    const restValues = [...employeeIds];
    let restExcludeClause = '';
    if (excludeShiftId) {
        restExcludeClause = 'AND ss.id <> ?';
        restValues.push(excludeShiftId);
    }
    restValues.push(formatSqlDateTime(windowEnd), formatSqlDateTime(windowStart));

    const [nearbyShifts] = await pool.query(
        `
        SELECT
            ss.id,
            ss.employeeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime
        FROM serviceScheduleShifts ss
        WHERE ss.employeeId IN (${employeePlaceholders})
          AND ss.deletedAt IS NULL
          AND ss.status = 'scheduled'
          ${restExcludeClause}
          AND TIMESTAMP(ss.scheduleDate, ss.startTime) < ?
          AND CASE
              WHEN ss.endTime <= ss.startTime
                  THEN TIMESTAMP(DATE_ADD(ss.scheduleDate, INTERVAL 1 DAY), ss.endTime)
              ELSE TIMESTAMP(ss.scheduleDate, ss.endTime)
          END > ?
        `,
        restValues
    );

    const shiftsByEmployee = new Map();
    nearbyShifts.forEach((shift) => {
        if (!shiftsByEmployee.has(shift.employeeId)) {
            shiftsByEmployee.set(shift.employeeId, []);
        }
        shiftsByEmployee.get(shift.employeeId).push(shift);
    });

    return rows
        .filter((row) =>
            isRestCompatible({
                targetStart,
                targetEnd,
                shifts: shiftsByEmployee.get(row.id) || [],
                minRestHours: row.minRestHours,
            })
        )
        .slice(0, 12)
        .map((row) => ({
        ...row,
        assignedToService: Boolean(row.assignedToService),
        minRestHours: Number(row.minRestHours) || DEFAULT_SUGGESTION_REST_HOURS,
    }));
};

export default listAvailableScheduleEmployeesService;
