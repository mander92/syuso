import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import { sendPushNotificationToUsersService } from '../push/sendPushNotificationService.js';

const ALERT_TYPE = 'missed_clock_in';

const toPositiveInteger = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const formatShiftDateTime = (dateText, startTime) => {
    const [year, month, day] = String(dateText || '').split('-');
    const time = String(startTime || '').slice(0, 5);
    return day && month && year && time
        ? `${day}/${month}/${year} ${time}`
        : 'su hora programada';
};

const selectMissedShiftRows = async (pool, { graceMinutes, lookbackHours }) => {
    const [rows] = await pool.query(
        `
        SELECT
            ss.id AS scheduleShiftId,
            ss.employeeId,
            ss.serviceId,
            DATE_FORMAT(ss.scheduleDate, '%Y-%m-%d') AS scheduleDateText,
            TIME_FORMAT(ss.startTime, '%H:%i:%s') AS startTimeText,
            TIME_FORMAT(ss.endTime, '%H:%i:%s') AS endTimeText,
            COALESCE(NULLIF(TRIM(CONCAT(employee.firstName, ' ', employee.lastName)), ''), employee.email) AS employeeName,
            employee.email AS employeeEmail,
            services.name AS serviceName,
            services.province AS serviceDelegation
        FROM serviceScheduleShifts ss
        INNER JOIN users employee ON employee.id = ss.employeeId
        INNER JOIN services ON services.id = ss.serviceId
        LEFT JOIN serviceScheduleShiftAlerts alerts
            ON alerts.scheduleShiftId = ss.id
           AND alerts.alertType = ?
        WHERE ss.employeeId IS NOT NULL
          AND ss.status = 'scheduled'
          AND ss.deletedAt IS NULL
          AND employee.active = true
          AND employee.deletedAt IS NULL
          AND alerts.id IS NULL
          AND TIMESTAMP(ss.scheduleDate, ss.startTime) <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)
          AND TIMESTAMP(ss.scheduleDate, ss.startTime) >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? HOUR)
          AND NOT EXISTS (
              SELECT 1
              FROM shiftRecords sr
              WHERE sr.employeeId = ss.employeeId
                AND sr.serviceId = ss.serviceId
                AND sr.deletedAt IS NULL
                AND COALESCE(sr.realClockIn, sr.clockIn) >= DATE_SUB(
                    TIMESTAMP(ss.scheduleDate, ss.startTime),
                    INTERVAL 6 HOUR
                )
                AND COALESCE(sr.realClockIn, sr.clockIn) <= CASE
                    WHEN ss.endTime <= ss.startTime
                        THEN TIMESTAMP(DATE_ADD(ss.scheduleDate, INTERVAL 1 DAY), ss.endTime)
                    ELSE TIMESTAMP(ss.scheduleDate, ss.endTime)
                END
          )
        ORDER BY ss.scheduleDate ASC, ss.startTime ASC
        LIMIT 50
        `,
        [ALERT_TYPE, graceMinutes, lookbackHours]
    );

    return rows;
};

const selectDelegationAdminUserIds = async (pool, delegation) => {
    const values = [];
    const normalizedDelegation = String(delegation || '').trim();
    let delegationFilter = '';

    if (normalizedDelegation) {
        delegationFilter = `
            OR (
                admins.role = 'admin'
                AND delegations.name = ?
            )
        `;
        values.push(normalizedDelegation);
    }

    const [rows] = await pool.query(
        `
        SELECT DISTINCT admins.id
        FROM users admins
        LEFT JOIN adminDelegations
            ON adminDelegations.adminId = admins.id
        LEFT JOIN delegations
            ON delegations.id = adminDelegations.delegationId
        WHERE admins.deletedAt IS NULL
          AND admins.active = true
          AND (
              admins.role = 'sudo'
              ${delegationFilter}
          )
        `,
        values
    );

    return rows.map((row) => row.id).filter(Boolean);
};

const reserveMissedShiftAlert = async (pool, row) => {
    const [result] = await pool.query(
        `
        INSERT IGNORE INTO serviceScheduleShiftAlerts (
            id, scheduleShiftId, employeeId, serviceId, alertType
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            uuid(),
            row.scheduleShiftId,
            row.employeeId,
            row.serviceId,
            ALERT_TYPE,
        ]
    );

    return result.affectedRows > 0;
};

export const notifyMissedScheduleShiftsService = async ({
    graceMinutes = 10,
    lookbackHours = 24,
} = {}) => {
    const pool = await getPool();
    const safeGraceMinutes = toPositiveInteger(graceMinutes, 10);
    const safeLookbackHours = toPositiveInteger(lookbackHours, 24);
    const rows = await selectMissedShiftRows(pool, {
        graceMinutes: safeGraceMinutes,
        lookbackHours: safeLookbackHours,
    });

    let processed = 0;

    for (const row of rows) {
        const reserved = await reserveMissedShiftAlert(pool, row);
        if (!reserved) continue;

        const adminUserIds = await selectDelegationAdminUserIds(
            pool,
            row.serviceDelegation
        );
        const shiftDateTime = formatShiftDateTime(
            row.scheduleDateText,
            row.startTimeText
        );
        const title = 'Turno sin fichar';
        const body = `${row.employeeName || 'Trabajador'} no ha fichado ${
            row.serviceName || 'el servicio'
        } a las ${shiftDateTime}.`;

        const employeeNotification = sendPushNotificationToUsersService(
            [row.employeeId],
            {
                title,
                body: `No consta tu fichaje de entrada en ${
                    row.serviceName || 'tu servicio'
                } de las ${shiftDateTime}.`,
                url: '/account',
                tag: `missed-shift-${row.scheduleShiftId}`,
                ttl: 300,
                urgency: 'high',
            }
        );

        const adminNotification = sendPushNotificationToUsersService(
            adminUserIds,
            {
                title,
                body,
                url: '/account',
                tag: `missed-shift-admin-${row.scheduleShiftId}`,
                ttl: 300,
                urgency: 'high',
            }
        );

        await Promise.all([employeeNotification, adminNotification]);
        processed += 1;
    }

    return { checked: rows.length, processed };
};

export default notifyMissedScheduleShiftsService;
