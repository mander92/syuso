import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectEmployeeRulesService from '../schedules/selectEmployeeRulesService.js';
import selectEmployeeAbsenceForDateService from '../schedules/selectEmployeeAbsenceForDateService.js';
import selectScheduledShiftForClockInService from '../schedules/selectScheduledShiftForClockInService.js';
import { getMadridDateTimeParts } from '../../utils/scheduleTimeUtil.js';

const startShiftRecordService = async (
    location, startDateTime, employeeId, serviceId
) => {

    const [latitudeIn, longitudeIn] = location;
    const pool = await getPool();
    const id = uuid();

    const { date: localDate, time: localTime } = getMadridDateTimeParts(
        new Date()
    );

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

    if (!allowUnscheduled) {
        const scheduledShift = await selectScheduledShiftForClockInService(
            serviceId,
            employeeId,
            localDate,
            localTime,
            clockInEarlyMinutes
        );

        if (!scheduledShift) {
            const [todayRows] = await pool.query(
                `
                SELECT startTime
                FROM serviceScheduleShifts
                WHERE serviceId = ?
                  AND employeeId = ?
                  AND status = 'scheduled'
                  AND deletedAt IS NULL
                  AND scheduleDate = ?
                ORDER BY startTime ASC
                `,
                [serviceId, employeeId, localDate]
            );

            if (todayRows.length) {
                const [startH, startM, startS = '0'] = String(
                    todayRows[0].startTime
                ).split(':');
                const [nowH, nowM, nowS = '0'] = String(localTime).split(':');
                const startSeconds =
                    Number(startH) * 3600 +
                    Number(startM) * 60 +
                    Number(startS);
                const nowSeconds =
                    Number(nowH) * 3600 +
                    Number(nowM) * 60 +
                    Number(nowS);
                const diffMinutes = Math.ceil(
                    (startSeconds - nowSeconds) / 60
                );

                if (diffMinutes > clockInEarlyMinutes) {
                    generateErrorUtil(
                        `Inicio demasiado pronto, espera ${clockInEarlyMinutes} min antes del comienzo de tu turno`,
                        403
                    );
                }
            }

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
    WHERE employeeId = ? AND serviceId = ? AND clockOut IS NULL
    `,
        [employeeId, serviceId]
    );

    if (rows.length > 0) {
        generateErrorUtil("Ya has fichado la entrada", 401);
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
