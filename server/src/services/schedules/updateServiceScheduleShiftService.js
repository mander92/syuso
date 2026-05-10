import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHourBreakdown } from './calculateShiftHourBreakdownsService.js';

const updateServiceScheduleShiftService = async (
    shiftId,
    updates
) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, serviceId, scheduleDate, startTime, endTime, hours, employeeId, status, shiftTypeId
        FROM serviceScheduleShifts
        WHERE id = ? AND deletedAt IS NULL
        `,
        [shiftId]
    );

    if (!rows.length) {
        generateErrorUtil('Turno no encontrado', 404);
    }

    const current = rows[0];
    const resolvedScheduleDate = updates.scheduleDate || current.scheduleDate;
    const resolvedStart = updates.startTime || current.startTime;
    const resolvedEnd = updates.endTime || current.endTime;
    const breakdown = await calculateShiftHourBreakdown(pool, current.serviceId, {
        scheduleDate: resolvedScheduleDate,
        startTime: resolvedStart,
        endTime: resolvedEnd,
    });
    const resolvedHours =
        updates.hours !== undefined && updates.hours !== null && updates.hours !== ''
            ? Number(updates.hours)
            : breakdown.hours;

    await pool.query(
        `
        UPDATE serviceScheduleShifts
        SET
            scheduleDate = ?,
            startTime = ?,
            endTime = ?,
            hours = ?,
            realHours = ?,
            nightHours = ?,
            holidayHours = ?,
            regularHours = ?,
            employeeId = ?,
            status = ?,
            shiftTypeId = ?
        WHERE id = ?
        `,
        [
            resolvedScheduleDate,
            resolvedStart,
            resolvedEnd,
            resolvedHours,
            breakdown.realHours,
            breakdown.nightHours,
            breakdown.holidayHours,
            breakdown.regularHours,
            updates.employeeId !== undefined ? updates.employeeId : current.employeeId,
            updates.status || current.status,
            updates.shiftTypeId !== undefined ? updates.shiftTypeId : current.shiftTypeId,
            shiftId,
        ]
    );

    return {
        id: shiftId,
        scheduleDate: resolvedScheduleDate,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        hours: resolvedHours,
        realHours: breakdown.realHours,
        nightHours: breakdown.nightHours,
        holidayHours: breakdown.holidayHours,
        regularHours: breakdown.regularHours,
        employeeId:
            updates.employeeId !== undefined ? updates.employeeId : current.employeeId,
        status: updates.status || current.status,
        shiftTypeId:
            updates.shiftTypeId !== undefined ? updates.shiftTypeId : current.shiftTypeId,
    };
};

export default updateServiceScheduleShiftService;
