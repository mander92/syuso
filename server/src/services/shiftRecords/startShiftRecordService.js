import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectEmployeeRulesService from '../schedules/selectEmployeeRulesService.js';
import selectEmployeeAbsenceForDateService from '../schedules/selectEmployeeAbsenceForDateService.js';
import selectScheduledShiftForClockInService from '../schedules/selectScheduledShiftForClockInService.js';
import { getMadridDateTimeParts } from '../../utils/scheduleTimeUtil.js';

const toSeconds = (value) => {
    const [hours, minutes, seconds = '0'] = String(value || '0:0:0').split(':');
    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds)
    );
};

const formatShiftTime = (row) => {
    if (!row) return '';
    const dateText =
        row.scheduleDate instanceof Date
            ? row.scheduleDate.toISOString().slice(0, 10)
            : String(row.scheduleDate || '').slice(0, 10);
    const [year, month, day] = dateText.split('-');
    const start = String(row.startTime || '').slice(0, 5);
    return day && month && year && start
        ? `${day}/${month}/${year} a las ${start}`
        : '';
};

const getScheduleDateKey = (row) => {
    if (!row?.scheduleDate) return '';
    if (row.scheduleDate instanceof Date) {
        return row.scheduleDate.toISOString().slice(0, 10);
    }
    return String(row.scheduleDate).slice(0, 10);
};

const startShiftRecordService = async (
    location, startDateTime, employeeId, serviceId
) => {

    const [latitudeIn, longitudeIn] = location;
    const pool = await getPool();
    const id = uuid();

    const clockInDate =
        startDateTime instanceof Date && !Number.isNaN(startDateTime.getTime())
            ? startDateTime
            : new Date();
    const { date: localDate, time: localTime } =
        getMadridDateTimeParts(clockInDate);

    const [serviceRows] = await pool.query(
        `
        SELECT allowUnscheduledClockIn, clockInEarlyMinutes
        FROM services
        WHERE id = ?
        `,
        [serviceId]
    );

    if (!serviceRows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    const allowUnscheduled = !!serviceRows[0].allowUnscheduledClockIn;
    const clockInEarlyMinutes =
        serviceRows[0].clockInEarlyMinutes != null
            ? Number(serviceRows[0].clockInEarlyMinutes)
            : 15;
    const absence = await selectEmployeeAbsenceForDateService(
        employeeId,
        localDate
    );

    if (absence) {
        generateErrorUtil('No puedes fichar en un dia de ausencia', 403);
    }

    const scheduledShift = await selectScheduledShiftForClockInService(
        serviceId,
        employeeId,
        localDate,
        localTime,
        clockInEarlyMinutes
    );

    if (!scheduledShift) {
        const [nextRows] = await pool.query(
            `
            SELECT scheduleDate, startTime, endTime
            FROM serviceScheduleShifts
            WHERE serviceId = ?
              AND employeeId = ?
              AND status = 'scheduled'
              AND deletedAt IS NULL
              AND (
                scheduleDate > ?
                OR (
                    scheduleDate = ?
                    AND (
                        startTime >= ?
                        OR endTime >= ?
                        OR endTime <= startTime
                    )
                )
                OR (
                    scheduleDate < ?
                    AND endTime <= startTime
                    AND DATE_ADD(scheduleDate, INTERVAL 1 DAY) = ?
                    AND endTime >= ?
                )
              )
            ORDER BY scheduleDate ASC, startTime ASC
            LIMIT 1
            `,
            [
                serviceId,
                employeeId,
                localDate,
                localDate,
                localTime,
                localTime,
                localDate,
                localDate,
                localTime,
            ]
        );

        if (nextRows.length) {
            const nextShift = nextRows[0];
            if (
                getScheduleDateKey(nextShift) === localDate &&
                toSeconds(nextShift.startTime) > toSeconds(localTime)
            ) {
                const diffMinutes = Math.ceil(
                    (toSeconds(nextShift.startTime) - toSeconds(localTime)) /
                        60
                );

                if (diffMinutes > clockInEarlyMinutes) {
                    generateErrorUtil(
                        `Inicio demasiado pronto. Tu proximo turno es el ${formatShiftTime(nextShift)}.`,
                        403
                    );
                }
            }

            generateErrorUtil(
                `No puedes iniciar ahora. Tu proximo turno es el ${formatShiftTime(nextShift)}.`,
                403
            );
        }

        if (!allowUnscheduled) {
            generateErrorUtil('No hay turno programado', 403);
        }
    }

    const rules = await selectEmployeeRulesService(employeeId);
    if (rules.minRestHours > 0) {
        const [lastShiftRows] = await pool.query(
            `
            SELECT realClockOut
            FROM shiftRecords
            WHERE employeeId = ?
              AND realClockOut IS NOT NULL
            ORDER BY realClockOut DESC
            LIMIT 1
            `,
            [employeeId]
        );

        if (lastShiftRows.length) {
            const lastClockOut = new Date(lastShiftRows[0].realClockOut);
            const now = new Date();
            const diffHours =
                (now.getTime() - lastClockOut.getTime()) / 3600000;

            if (diffHours < rules.minRestHours) {
                generateErrorUtil(
                    'No se respeta el descanso minimo entre turnos',
                    403
                );
            }
        }
    }

    // Verificar si ya hay un turno abierto
    const [rows] = await pool.query(
        `
    SELECT id
    FROM shiftRecords
    WHERE employeeId = ? AND clockOut IS NULL
    `,
        [employeeId]
    );

    if (rows.length > 0) {
        generateErrorUtil("Ya tienes un turno abierto", 401);
    }

    // Insertar nuevo turno
    await pool.query(
        `
    INSERT INTO shiftRecords (id, clockIn, realClockIn, employeeId, serviceId, latitudeIn, longitudeIn)
    VALUES (?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?)
    `,
        [
            id,
            startDateTime,
            employeeId,
            serviceId,
            latitudeIn,
            longitudeIn,
        ]
    );

    return id;

};

export default startShiftRecordService;
