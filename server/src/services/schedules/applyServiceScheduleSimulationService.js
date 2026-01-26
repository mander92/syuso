import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

const normalizeShift = (shift) => ({
    id: shift.id,
    scheduleDate: shift.scheduleDate,
    startTime: shift.startTime,
    endTime: shift.endTime,
    hours:
        shift.hours != null
            ? Number(shift.hours)
            : calculateShiftHours(shift.startTime, shift.endTime),
    employeeId: shift.employeeId || null,
    shiftTypeId: shift.shiftTypeId || null,
    isNew: Boolean(shift.isNew),
});

const applyServiceScheduleSimulationService = async (serviceId, month, shifts = []) => {
    const pool = await getPool();
    const list = Array.isArray(shifts) ? shifts.map(normalizeShift) : [];
    if (!list.length) return { applied: 0, created: 0 };

    const ids = list.filter((shift) => !shift.isNew && shift.id).map((shift) => shift.id);
    const idSet = new Set(ids);

    if (idSet.size) {
        const [validRows] = await pool.query(
            `
            SELECT id
            FROM serviceScheduleShifts
            WHERE serviceId = ?
              AND id IN (?)
              AND deletedAt IS NULL
            `,
            [serviceId, [...idSet]]
        );
        const validSet = new Set(validRows.map((row) => row.id));
        list.forEach((shift) => {
            if (!shift.isNew && !validSet.has(shift.id)) {
                shift.isNew = true;
                shift.id = uuid();
            }
        });
    }

    const toUpdate = list.filter((shift) => !shift.isNew);
    const toInsert = list.filter((shift) => shift.isNew);

    if (toUpdate.length) {
        for (const shift of toUpdate) {
            await pool.query(
                `
                UPDATE serviceScheduleShifts
                SET employeeId = ?,
                    shiftTypeId = ?,
                    scheduleDate = ?,
                    startTime = ?,
                    endTime = ?,
                    hours = ?
                WHERE id = ? AND serviceId = ? AND deletedAt IS NULL
                `,
                [
                    shift.employeeId,
                    shift.shiftTypeId,
                    shift.scheduleDate,
                    shift.startTime,
                    shift.endTime,
                    shift.hours,
                    shift.id,
                    serviceId,
                ]
            );
        }
    }

    if (toInsert.length) {
        const insertValues = toInsert.map((shift) => [
            shift.id || uuid(),
            serviceId,
            shift.employeeId,
            shift.shiftTypeId,
            shift.scheduleDate,
            shift.startTime,
            shift.endTime,
            shift.hours,
            'scheduled',
        ]);
        await pool.query(
            `
            INSERT INTO serviceScheduleShifts
                (id, serviceId, employeeId, shiftTypeId, scheduleDate, startTime, endTime, hours, status)
            VALUES ?
            `,
            [insertValues]
        );
    }

    return { applied: toUpdate.length, created: toInsert.length };
};

export default applyServiceScheduleSimulationService;
