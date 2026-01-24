import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

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

    const resolvedHours =
        hours !== undefined && hours !== null && hours !== ''
            ? Number(hours)
            : calculateShiftHours(startTime, endTime);

    await pool.query(
        `
        INSERT INTO serviceScheduleShifts
            (id, serviceId, employeeId, shiftTypeId, scheduleDate, startTime, endTime, hours, status, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
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
        status: 'scheduled',
    };
};

export default createServiceScheduleShiftService;
