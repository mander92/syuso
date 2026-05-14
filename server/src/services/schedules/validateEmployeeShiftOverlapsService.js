import generateErrorUtil from '../../utils/generateErrorUtil.js';

const pad = (value) => String(value).padStart(2, '0');

const normalizeDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
            value.getDate()
        )}`;
    }
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const addDays = (dateKey, days) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

const toSeconds = (time) => {
    const [hours, minutes, seconds = '0'] = String(time || '').split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const toInterval = (shift) => {
    const dateKey = normalizeDateKey(shift.scheduleDate);
    if (!dateKey || !shift.startTime || !shift.endTime) return null;

    const [year, month, day] = dateKey.split('-').map(Number);
    const startSeconds = toSeconds(shift.startTime);
    const endSeconds = toSeconds(shift.endTime);
    if ([year, month, day, startSeconds, endSeconds].some(Number.isNaN)) {
        return null;
    }

    const dayStart = Date.UTC(year, month - 1, day);
    const start = dayStart + startSeconds * 1000;
    const end =
        dayStart +
        endSeconds * 1000 +
        (endSeconds <= startSeconds ? 24 * 60 * 60 * 1000 : 0);

    return { start, end, dateKey };
};

const intervalsOverlap = (a, b) => a.start < b.end && b.start < a.end;

const formatDateEs = (dateKey) => {
    const [year, month, day] = String(dateKey || '').split('-');
    return year && month && day ? `${day}/${month}/${year}` : dateKey;
};

const formatTime = (value) => String(value || '').slice(0, 5);

const buildConflictMessage = (conflict) => {
    const employeeName = [conflict.firstName, conflict.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    const shift = conflict.shift;
    const existing = conflict.existing;
    const employeeText = employeeName || 'el empleado';
    return `Hay turnos pisados para ${employeeText}: ${formatDateEs(
        normalizeDateKey(shift.scheduleDate)
    )} ${formatTime(shift.startTime)}-${formatTime(
        shift.endTime
    )} coincide con ${formatDateEs(normalizeDateKey(existing.scheduleDate))} ${formatTime(
        existing.startTime
    )}-${formatTime(existing.endTime)}`;
};

const shouldIgnoreExisting = (row, options) => {
    const excludeIds = options.excludeShiftIds || new Set();
    if (row.id && excludeIds.has(row.id)) return true;

    if (options.ignoreServiceId && options.ignoreMonth) {
        return (
            row.serviceId === options.ignoreServiceId &&
            normalizeDateKey(row.scheduleDate).startsWith(options.ignoreMonth)
        );
    }

    return false;
};

const validateEmployeeShiftOverlapsService = async (
    pool,
    shifts = [],
    options = {}
) => {
    const candidates = (Array.isArray(shifts) ? shifts : [])
        .filter((shift) => shift?.employeeId && shift.scheduleDate)
        .map((shift) => ({
            ...shift,
            scheduleDate: normalizeDateKey(shift.scheduleDate),
            interval: toInterval(shift),
        }))
        .filter((shift) => shift.interval);

    if (!candidates.length) return;

    const employeeIds = [...new Set(candidates.map((shift) => shift.employeeId))];
    const dateKeys = candidates.map((shift) => shift.interval.dateKey).sort();
    const minDate = addDays(dateKeys[0], -1);
    const maxDate = addDays(dateKeys[dateKeys.length - 1], 1);
    const excludeShiftIds = new Set(
        Array.from(options.excludeShiftIds || []).filter(Boolean)
    );

    for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
            const a = candidates[i];
            const b = candidates[j];
            if (a.employeeId !== b.employeeId) continue;
            if (a.id && b.id && a.id === b.id) continue;
            if (intervalsOverlap(a.interval, b.interval)) {
                const [[employee = {}]] = await pool.query(
                    'SELECT firstName, lastName FROM users WHERE id = ?',
                    [a.employeeId]
                );
                generateErrorUtil(
                    buildConflictMessage({
                        ...employee,
                        shift: a,
                        existing: b,
                    }),
                    409
                );
            }
        }
    }

    const [existingRows] = await pool.query(
        `
        SELECT
            ss.id,
            ss.serviceId,
            ss.employeeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            u.firstName,
            u.lastName
        FROM serviceScheduleShifts ss
        LEFT JOIN users u ON u.id = ss.employeeId
        WHERE ss.employeeId IN (?)
          AND ss.deletedAt IS NULL
          AND ss.status = 'scheduled'
          AND ss.scheduleDate BETWEEN ? AND ?
        `,
        [employeeIds, minDate, maxDate]
    );

    const existing = existingRows
        .filter((row) =>
            !shouldIgnoreExisting(row, {
                ...options,
                excludeShiftIds,
            })
        )
        .map((row) => ({
            ...row,
            scheduleDate: normalizeDateKey(row.scheduleDate),
            interval: toInterval(row),
        }))
        .filter((row) => row.interval);

    for (const candidate of candidates) {
        for (const row of existing) {
            if (candidate.employeeId !== row.employeeId) continue;
            if (candidate.id && candidate.id === row.id) continue;
            if (!intervalsOverlap(candidate.interval, row.interval)) continue;
            generateErrorUtil(
                buildConflictMessage({
                    firstName: row.firstName,
                    lastName: row.lastName,
                    shift: candidate,
                    existing: row,
                }),
                409
            );
        }
    }
};

export default validateEmployeeShiftOverlapsService;
