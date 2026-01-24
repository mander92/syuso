import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

const updateServiceScheduleShiftService = async (
    shiftId,
    updates
) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, scheduleDate, startTime, endTime, hours, employeeId, status, shiftTypeId
        FROM serviceScheduleShifts
        WHERE id = ? AND deletedAt IS NULL
        `,
        [shiftId]
    );

    if (!rows.length) {
        generateErrorUtil('Turno no encontrado', 404);
    }

    const current = rows[0];
    const resolvedStart = updates.startTime || current.startTime;
    const resolvedEnd = updates.endTime || current.endTime;
    const resolvedHours =
        updates.hours !== undefined && updates.hours !== null && updates.hours !== ''
            ? Number(updates.hours)
            : calculateShiftHours(resolvedStart, resolvedEnd);

    await pool.query(
        `
        UPDATE serviceScheduleShifts
        SET
            scheduleDate = ?,
            startTime = ?,
            endTime = ?,
            hours = ?,
            employeeId = ?,
            status = ?,
            shiftTypeId = ?
        WHERE id = ?
        `,
        [
            updates.scheduleDate || current.scheduleDate,
            resolvedStart,
            resolvedEnd,
            resolvedHours,
            updates.employeeId !== undefined ? updates.employeeId : current.employeeId,
            updates.status || current.status,
            updates.shiftTypeId !== undefined ? updates.shiftTypeId : current.shiftTypeId,
            shiftId,
        ]
    );

    return {
        id: shiftId,
        scheduleDate: updates.scheduleDate || current.scheduleDate,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        hours: resolvedHours,
        employeeId:
            updates.employeeId !== undefined ? updates.employeeId : current.employeeId,
        status: updates.status || current.status,
        shiftTypeId:
            updates.shiftTypeId !== undefined ? updates.shiftTypeId : current.shiftTypeId,
    };
};

export default updateServiceScheduleShiftService;
