import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHourBreakdown } from './calculateShiftHourBreakdownsService.js';
import validateEmployeeShiftOverlapsService from './validateEmployeeShiftOverlapsService.js';
import {
    monthFromDate,
    saveServiceScheduleSnapshot,
} from './serviceScheduleSnapshotService.js';

const updateServiceScheduleShiftService = async (
    shiftId,
    updates,
    options = {}
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
    const resolvedEmployeeId =
        updates.employeeId !== undefined ? updates.employeeId : current.employeeId;
    const resolvedShiftTypeId =
        updates.shiftTypeId !== undefined ? updates.shiftTypeId : current.shiftTypeId;
    const resolvedStatus = updates.status || current.status;

    await validateEmployeeShiftOverlapsService(
        pool,
        [
            {
                id: shiftId,
                serviceId: current.serviceId,
                employeeId: resolvedEmployeeId,
                scheduleDate: resolvedScheduleDate,
                startTime: resolvedStart,
                endTime: resolvedEnd,
            },
        ],
        { ...options, excludeShiftIds: new Set([shiftId]) }
    );

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
            resolvedEmployeeId,
            resolvedStatus,
            resolvedShiftTypeId,
            shiftId,
        ]
    );

    const previousMonth = monthFromDate(current.scheduleDate);
    const nextMonth = monthFromDate(resolvedScheduleDate);
    await saveServiceScheduleSnapshot(pool, current.serviceId, previousMonth);
    if (nextMonth !== previousMonth) {
        await saveServiceScheduleSnapshot(pool, current.serviceId, nextMonth);
    }

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
        previousEmployeeId: current.employeeId,
        employeeId: resolvedEmployeeId,
        status: resolvedStatus,
        shiftTypeId: resolvedShiftTypeId,
    };
};

export default updateServiceScheduleShiftService;
