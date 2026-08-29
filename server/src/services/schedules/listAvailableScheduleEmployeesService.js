import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const toSeconds = (time) => {
    const [hours, minutes, seconds = '0'] = String(time || '').split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const normalizeTime = (value) => {
    const [hours = '00', minutes = '00'] = String(value || '').split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
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
        LIMIT 12
        `,
        values
    );

    return rows.map((row) => ({
        ...row,
        assignedToService: Boolean(row.assignedToService),
    }));
};

export default listAvailableScheduleEmployeesService;
