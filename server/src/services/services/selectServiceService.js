import getPool from '../../db/getPool.js';
import { getMadridDateTimeParts } from '../../utils/scheduleTimeUtil.js';

const selectServiceService = async (
    status,
    type,
    delegationNames = [],
    startDateFrom,
    startDateTo
) => {
    const pool = await getPool();
    const madridNow = getMadridDateTimeParts();
    const currentMadridDateTime = `${madridNow.date} ${madridNow.time}`;

    let sqlQuery = `
    SELECT s.id AS serviceId, s.name, s.status, s.type, s.province,
           s.autonomousCommunity, s.hourRuleType, s.startDateTime,
           s.endDateTime, s.hours, s.scheduleImage, s.scheduleView,
           s.locationLink,
           a.city, a.address, a.postCode,
           (
               SELECT GROUP_CONCAT(
                   DISTINCT COALESCE(
                       NULLIF(TRIM(CONCAT(u_open.firstName, ' ', u_open.lastName)), ''),
                       u_open.email
                   )
                   ORDER BY u_open.firstName, u_open.lastName
                   SEPARATOR ', '
               )
               FROM shiftRecords sr_open
               INNER JOIN users u_open ON u_open.id = sr_open.employeeId
               WHERE sr_open.serviceId = s.id
                 AND sr_open.clockOut IS NULL
                 AND sr_open.deletedAt IS NULL
           ) AS activeWorkerNames,
           (
               SELECT GROUP_CONCAT(
                   DISTINCT COALESCE(
                       NULLIF(TRIM(CONCAT(u_missed.firstName, ' ', u_missed.lastName)), ''),
                       u_missed.email
                   )
                   ORDER BY u_missed.firstName, u_missed.lastName
                   SEPARATOR ', '
               )
               FROM serviceScheduleShifts ss_missed
               INNER JOIN users u_missed ON u_missed.id = ss_missed.employeeId
               WHERE ss_missed.serviceId = s.id
                 AND ss_missed.employeeId IS NOT NULL
                 AND ss_missed.status = 'scheduled'
                 AND ss_missed.deletedAt IS NULL
                 AND ? >= TIMESTAMP(ss_missed.scheduleDate, ss_missed.startTime)
                 AND ? < CASE
                     WHEN ss_missed.endTime <= ss_missed.startTime
                         THEN TIMESTAMP(
                             DATE_ADD(ss_missed.scheduleDate, INTERVAL 1 DAY),
                             ss_missed.endTime
                         )
                     ELSE TIMESTAMP(ss_missed.scheduleDate, ss_missed.endTime)
                 END
                 AND NOT EXISTS (
                     SELECT 1
                     FROM shiftRecords sr_missed
                     WHERE sr_missed.serviceId = ss_missed.serviceId
                       AND sr_missed.employeeId = ss_missed.employeeId
                       AND sr_missed.deletedAt IS NULL
                       AND sr_missed.clockIn >= DATE_SUB(
                           TIMESTAMP(ss_missed.scheduleDate, ss_missed.startTime),
                           INTERVAL 6 HOUR
                       )
                       AND sr_missed.clockIn <= CASE
                           WHEN ss_missed.endTime <= ss_missed.startTime
                               THEN TIMESTAMP(
                                   DATE_ADD(ss_missed.scheduleDate, INTERVAL 1 DAY),
                                   ss_missed.endTime
                               )
                           ELSE TIMESTAMP(
                               ss_missed.scheduleDate,
                               ss_missed.endTime
                           )
                       END
                 )
           ) AS missedShiftWorkerNames,
           (
               SELECT JSON_OBJECT(
                   'date', DATE_FORMAT(ss_next.scheduleDate, '%Y-%m-%d'),
                   'startTime', TIME_FORMAT(ss_next.startTime, '%H:%i'),
                   'endTime', TIME_FORMAT(ss_next.endTime, '%H:%i'),
                   'employeeName', COALESCE(
                       NULLIF(TRIM(CONCAT(u_next.firstName, ' ', u_next.lastName)), ''),
                       u_next.email,
                       'Sin asignar'
                   )
               )
               FROM serviceScheduleShifts ss_next
               LEFT JOIN users u_next ON u_next.id = ss_next.employeeId
               WHERE ss_next.serviceId = s.id
                 AND ss_next.status = 'scheduled'
                 AND ss_next.deletedAt IS NULL
                 AND TIMESTAMP(ss_next.scheduleDate, ss_next.startTime) > ?
               ORDER BY ss_next.scheduleDate, ss_next.startTime
               LIMIT 1
           ) AS nextScheduledShift,
           (
               SELECT GROUP_CONCAT(pa.employeeId)
               FROM personsAssigned pa
               INNER JOIN users u ON u.id = pa.employeeId
               WHERE pa.serviceId = s.id
                 AND u.active = 1
                 AND u.deletedAt IS NULL
           ) AS assignedEmployeeIds
    FROM addresses a
    INNER JOIN services s
    ON a.id = s.addressId
    WHERE s.deletedAt IS NULL
    `;

    let sqlValues = [
        currentMadridDateTime,
        currentMadridDateTime,
        currentMadridDateTime,
    ];

    if (status) {
        sqlQuery += ' AND status = ?';
        sqlValues.push(status);
    }

    if (type) {
        sqlQuery += ' AND s.type = ?';
        sqlValues.push(type);
    }

    if (delegationNames.length) {
        const delegationPlaceholders = delegationNames
            .map(() => '?')
            .join(', ');
        sqlQuery += ` AND (s.province IN (${delegationPlaceholders}) OR a.city IN (${delegationPlaceholders}))`;
        sqlValues.push(...delegationNames, ...delegationNames);
    }

    if (startDateFrom) {
        sqlQuery += ' AND DATE(s.startDateTime) >= ?';
        sqlValues.push(startDateFrom);
    }

    if (startDateTo) {
        sqlQuery += ' AND DATE(s.startDateTime) <= ?';
        sqlValues.push(startDateTo);
    }

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};
export default selectServiceService;
