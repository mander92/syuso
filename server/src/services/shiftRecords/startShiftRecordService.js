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
        SELECT allowUnscheduledClockIn
        FROM services
        WHERE id = ?
        `,
        [serviceId]
    );

    if (!serviceRows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    const allowUnscheduled = !!serviceRows[0].allowUnscheduledClockIn;
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
            localTime
        );

        if (!scheduledShift) {
            generateErrorUtil('No tienes un turno programado', 403);
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
