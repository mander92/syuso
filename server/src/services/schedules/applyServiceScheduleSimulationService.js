import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';
import { calculateShiftHourBreakdowns } from './calculateShiftHourBreakdownsService.js';
import validateEmployeeShiftOverlapsService from './validateEmployeeShiftOverlapsService.js';
import { saveServiceScheduleSnapshot } from './serviceScheduleSnapshotService.js';

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

const applyServiceScheduleSimulationService = async (
    serviceId,
    month,
    shifts = [],
    options = {}
) => {
    const pool = await getPool();
    const list = Array.isArray(shifts) ? shifts.map(normalizeShift) : [];
    if (!list.length) return { applied: 0, created: 0 };
    list.forEach((shift) => {
        if (shift.isNew && !shift.id) shift.id = uuid();
    });

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
    await validateEmployeeShiftOverlapsService(
        pool,
        list.map((shift) => ({
            ...shift,
            serviceId,
        })),
        {
            ...options,
            excludeShiftIds: new Set(
                toUpdate.map((shift) => shift.id).filter(Boolean)
            ),
        }
    );
    const breakdowns = await calculateShiftHourBreakdowns(pool, serviceId, list);
    const breakdownById = new Map(
        list.map((shift, index) => [shift.id, breakdowns[index]])
    );

    if (toUpdate.length) {
        for (const shift of toUpdate) {
            const breakdown = breakdownById.get(shift.id);
            await pool.query(
                `
                UPDATE serviceScheduleShifts
                SET employeeId = ?,
                    shiftTypeId = ?,
                    scheduleDate = ?,
                    startTime = ?,
                    endTime = ?,
                    hours = ?,
                    realHours = ?,
                    nightHours = ?,
                    holidayHours = ?,
                    regularHours = ?
                WHERE id = ? AND serviceId = ? AND deletedAt IS NULL
                `,
                [
                    shift.employeeId,
                    shift.shiftTypeId,
                    shift.scheduleDate,
                    shift.startTime,
                    shift.endTime,
                    breakdown?.hours ?? shift.hours,
                    breakdown?.realHours ?? shift.hours,
                    breakdown?.nightHours ?? 0,
                    breakdown?.holidayHours ?? 0,
                    breakdown?.regularHours ?? shift.hours,
                    shift.id,
                    serviceId,
                ]
            );
        }
    }

    if (toInsert.length) {
        const insertValues = toInsert.map((shift) => {
            const breakdown = breakdownById.get(shift.id);
            return [
                shift.id || uuid(),
                serviceId,
                shift.employeeId,
                shift.shiftTypeId,
                shift.scheduleDate,
                shift.startTime,
                shift.endTime,
                breakdown?.hours ?? shift.hours,
                breakdown?.realHours ?? shift.hours,
                breakdown?.nightHours ?? 0,
                breakdown?.holidayHours ?? 0,
                breakdown?.regularHours ?? shift.hours,
                'scheduled',
            ];
        });
        await pool.query(
            `
            INSERT INTO serviceScheduleShifts
                (
                    id, serviceId, employeeId, shiftTypeId, scheduleDate,
                    startTime, endTime, hours, realHours, nightHours,
                    holidayHours, regularHours, status
                )
            VALUES ?
            `,
            [insertValues]
        );
    }

    await saveServiceScheduleSnapshot(pool, serviceId, month);

    return { applied: toUpdate.length, created: toInsert.length };
};

export default applyServiceScheduleSimulationService;
