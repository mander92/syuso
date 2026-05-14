import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHourBreakdown } from './calculateShiftHourBreakdownsService.js';
import validateEmployeeShiftOverlapsService from './validateEmployeeShiftOverlapsService.js';

const createServiceScheduleShiftService = async (
    serviceId,
    scheduleDate,
    startTime,
    endTime,
    hours,
    employeeId,
    shiftTypeId,
    createdBy
) => {
    const pool = await getPool();
    const id = uuid();

    const breakdown = await calculateShiftHourBreakdown(pool, serviceId, {
        scheduleDate,
        startTime,
        endTime,
    });
    const resolvedHours =
        hours !== undefined && hours !== null && hours !== ''
            ? Number(hours)
            : breakdown.hours;

    await validateEmployeeShiftOverlapsService(pool, [
        {
            serviceId,
            employeeId: employeeId || null,
            scheduleDate,
            startTime,
            endTime,
        },
    ]);

    await pool.query(
        `
        INSERT INTO serviceScheduleShifts
            (
                id, serviceId, employeeId, shiftTypeId, scheduleDate, startTime,
                endTime, hours, realHours, nightHours, holidayHours,
                regularHours, status, createdBy
            )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `,
        [
            id,
            serviceId,
            employeeId || null,
            shiftTypeId || null,
            scheduleDate,
            startTime,
            endTime,
            resolvedHours,
            breakdown.realHours,
            breakdown.nightHours,
            breakdown.holidayHours,
            breakdown.regularHours,
            createdBy,
        ]
    );

    return {
        id,
        serviceId,
        employeeId: employeeId || null,
        shiftTypeId: shiftTypeId || null,
        scheduleDate,
        startTime,
        endTime,
        hours: resolvedHours,
        realHours: breakdown.realHours,
        nightHours: breakdown.nightHours,
        holidayHours: breakdown.holidayHours,
        regularHours: breakdown.regularHours,
        status: 'scheduled',
    };
};

export default createServiceScheduleShiftService;
