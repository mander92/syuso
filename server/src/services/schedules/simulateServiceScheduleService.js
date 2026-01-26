import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';
import { calculateShiftHours } from '../../utils/scheduleTimeUtil.js';

const buildDateString = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekdayNumber = (date) => {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
};

const toDateKey = (value) => {
    if (!value) return null;
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return buildDateString(parsed);
};

const toDateTime = (dateKey, time) => {
    const [hour = '0', minute = '0', second = '0'] = String(time || '').split(':');
    return new Date(`${dateKey}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}Z`);
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
};

const toDateNumber = (dateKey) => {
    if (!dateKey) return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return null;
    return Date.UTC(year, month - 1, day) / 86400000;
};

const buildMonthRange = (month) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
    return { monthStart, monthEnd };
};

const isWeekendGroupDate = (date, groupDates) => {
    return groupDates.some((key) => key === date);
};

const simulateServiceScheduleService = async (serviceId, monthParam) => {
    const pool = await getPool();
    const month = monthParam || new Date().toISOString().slice(0, 7);
    const { monthStart, monthEnd } = buildMonthRange(month);
    const monthStartKey = buildDateString(monthStart);
    const monthEndKey = buildDateString(monthEnd);

    const [assignedEmployees] = await pool.query(
        `
        SELECT u.id, u.firstName, u.lastName
        FROM personsAssigned pa
        JOIN users u ON u.id = pa.employeeId
        WHERE pa.serviceId = ?
          AND u.active = 1
        `,
        [serviceId]
    );

    if (!assignedEmployees.length) {
        return { month, shifts: [], employees: [] };
    }

    const [serviceShifts] = await pool.query(
        `
        SELECT
            ss.id,
            ss.serviceId,
            ss.employeeId,
            ss.shiftTypeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            ss.hours,
            ss.status,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor
        FROM serviceScheduleShifts ss
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.serviceId = ?
          AND ss.deletedAt IS NULL
          AND DATE_FORMAT(ss.scheduleDate, "%Y-%m") = ?
        ORDER BY ss.scheduleDate ASC, ss.startTime ASC
        `,
        [serviceId, month]
    );

    let shifts = serviceShifts.map((shift) => ({
        ...shift,
        scheduleDate: toDateKey(shift.scheduleDate),
        isNew: false,
    }));

    if (!shifts.length) {
        const [monthTemplates] = await pool.query(
            `
            SELECT weekday, startTime, endTime, slots, shiftTypeId
            FROM serviceScheduleTemplates
            WHERE serviceId = ? AND month = ?
            `,
            [serviceId, month]
        );

        let templates = monthTemplates;

        if (!templates.length) {
            const [defaultTemplates] = await pool.query(
                `
                SELECT weekday, startTime, endTime, slots, shiftTypeId
                FROM serviceScheduleTemplates
                WHERE serviceId = ? AND month = ''
                `,
                [serviceId]
            );
            templates = defaultTemplates;
        }

        if (templates.length) {
            const generated = [];
            for (
                let current = new Date(monthStart);
                current <= monthEnd;
                current = addDays(current, 1)
            ) {
                const weekday = getWeekdayNumber(current);
                const dayTemplates = templates.filter(
                    (template) => template.weekday === weekday
                );
                if (!dayTemplates.length) continue;
                const scheduleDate = buildDateString(current);
                dayTemplates.forEach((template) => {
                    const slots = Number(template.slots) || 1;
                    const hours = calculateShiftHours(
                        template.startTime,
                        template.endTime
                    );
                    for (let i = 0; i < slots; i += 1) {
                        generated.push({
                            id: uuid(),
                            serviceId,
                            employeeId: null,
                            shiftTypeId: template.shiftTypeId || null,
                            scheduleDate,
                            startTime: template.startTime,
                            endTime: template.endTime,
                            hours,
                            status: 'scheduled',
                            shiftTypeName: null,
                            shiftTypeColor: null,
                            isNew: true,
                        });
                    }
                });
            }
            shifts = generated;
        }
    }

    if (!shifts.length) {
        return { month, shifts: [], employees: assignedEmployees };
    }

    const [shiftTypeRows] = await pool.query(
        `
        SELECT id, name, color
        FROM serviceShiftTypes
        WHERE serviceId = ?
        `,
        [serviceId]
    );

    const shiftTypeMap = new Map();
    shiftTypeRows.forEach((row) => {
        shiftTypeMap.set(row.id, { name: row.name, color: row.color });
    });

    const employeeIds = assignedEmployees.map((employee) => employee.id);

    const [rulesRows] = await pool.query(
        `
        SELECT employeeId, minMonthlyHours, maxMonthlyHours, minRestHours, restWeekendType, restWeekendCount
        FROM employeeRules
        WHERE employeeId IN (?)
        `,
        [employeeIds]
    );

    const rulesMap = new Map();
    rulesRows.forEach((row) => {
        rulesMap.set(row.employeeId, row);
    });

    const [absenceRows] = await pool.query(
        `
        SELECT id, employeeId, startDate, endDate, type
        FROM employeeAbsences
        WHERE employeeId IN (?)
          AND startDate <= ?
          AND (endDate IS NULL OR endDate >= ?)
        `,
        [employeeIds, monthEndKey, monthStartKey]
    );

    const [allShiftRows] = await pool.query(
        `
        SELECT id, employeeId, serviceId, scheduleDate, startTime, endTime, hours
        FROM serviceScheduleShifts
        WHERE employeeId IN (?)
          AND deletedAt IS NULL
          AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?
        `,
        [employeeIds, month]
    );

    const assignedHours = new Map();
    const otherServiceDates = new Map();
    const employeeShiftTimes = new Map();

    allShiftRows.forEach((row) => {
        const dateKey = toDateKey(row.scheduleDate);
        if (!dateKey) return;
        if (row.serviceId !== serviceId) {
            assignedHours.set(
                row.employeeId,
                (assignedHours.get(row.employeeId) || 0) + Number(row.hours || 0)
            );
            if (!otherServiceDates.has(row.employeeId)) {
                otherServiceDates.set(row.employeeId, new Set());
            }
            otherServiceDates.get(row.employeeId).add(dateKey);
            if (!employeeShiftTimes.has(row.employeeId)) {
                employeeShiftTimes.set(row.employeeId, []);
            }
            employeeShiftTimes.get(row.employeeId).push({
                dateKey,
                startTime: row.startTime,
                endTime: row.endTime,
            });
        }
    });

    const absenceMap = new Map();
    const availabilityMap = new Map();

    absenceRows.forEach((absence) => {
        const startKey = toDateKey(absence.startDate);
        if (!startKey) return;
        const endKey = toDateKey(absence.endDate) || startKey;
        if (!absenceMap.has(absence.employeeId)) {
            absenceMap.set(absence.employeeId, new Map());
        }
        if (!availabilityMap.has(absence.employeeId)) {
            availabilityMap.set(absence.employeeId, new Set());
        }
        const startDate = new Date(`${startKey}T00:00:00Z`);
        const endDate = new Date(`${endKey}T00:00:00Z`);
        for (
            let current = new Date(startDate);
            current <= endDate;
            current = addDays(current, 1)
        ) {
            const key = buildDateString(current);
            if (absence.type === 'available') {
                availabilityMap.get(absence.employeeId).add(key);
            } else {
                absenceMap.get(absence.employeeId).set(key, absence.type);
            }
        }
    });

    const weekendGroups = [];
    for (
        let current = new Date(monthStart);
        current <= monthEnd;
        current = addDays(current, 1)
    ) {
        if (current.getUTCDay() !== 5) continue;
        const friday = buildDateString(current);
        const saturday = buildDateString(addDays(current, 1));
        const sunday = buildDateString(addDays(current, 2));
        weekendGroups.push([friday, saturday, sunday]);
    }

    const totalWeekendGroups = weekendGroups.length;
    const weekendWorkSet = new Map();

    allShiftRows.forEach((row) => {
        if (row.serviceId === serviceId) return;
        const dateKey = toDateKey(row.scheduleDate);
        if (!dateKey) return;
        const groupIndex = weekendGroups.findIndex((group) =>
            isWeekendGroupDate(dateKey, group)
        );
        if (groupIndex < 0) return;
        if (!weekendWorkSet.has(row.employeeId)) {
            weekendWorkSet.set(row.employeeId, new Set());
        }
        weekendWorkSet.get(row.employeeId).add(groupIndex);
    });

    const assignedDatesByEmployee = new Map();
    const simulatedShifts = shifts.map((shift) => ({
        ...shift,
        employeeId: null,
    }));

    simulatedShifts.forEach((shift) => {
        if (!shift.shiftTypeId) return;
        const type = shiftTypeMap.get(shift.shiftTypeId);
        if (!type) return;
        shift.shiftTypeName = type.name;
        shift.shiftTypeColor = type.color;
    });

    const unassignedShiftIds = new Set(simulatedShifts.map((shift) => shift.id));

    const dateGroups = new Map();
    simulatedShifts.forEach((shift) => {
        const dateKey = toDateKey(shift.scheduleDate);
        if (!dateKey) return;
        const timeKey = `${shift.startTime}-${shift.endTime}-${shift.shiftTypeId || ''}`;
        if (!dateGroups.has(dateKey)) {
            dateGroups.set(dateKey, new Map());
        }
        const dayGroup = dateGroups.get(dateKey);
        if (!dayGroup.has(timeKey)) {
            dayGroup.set(timeKey, []);
        }
        dayGroup.get(timeKey).push(shift);
    });

    const bundleAssignments = [];

    weekendGroups.forEach((group, groupIndex) => {
        if (group.some((dateKey) => !dateGroups.has(dateKey))) return;
        const [fri, sat, sun] = group;
        const fridayGroups = dateGroups.get(fri);
        fridayGroups.forEach((fridayShifts, timeKey) => {
            const saturdayShifts = dateGroups.get(sat).get(timeKey) || [];
            const sundayShifts = dateGroups.get(sun).get(timeKey) || [];
            const bundleCount = Math.min(
                fridayShifts.length,
                saturdayShifts.length,
                sundayShifts.length
            );
            for (let i = 0; i < bundleCount; i += 1) {
                const bundle = [
                    fridayShifts[i],
                    saturdayShifts[i],
                    sundayShifts[i],
                ];
                if (bundle.some((shift) => !unassignedShiftIds.has(shift.id))) {
                    continue;
                }
                bundleAssignments.push({ groupIndex, shifts: bundle });
            }
        });
    });

    const getRuleValue = (employeeId, field, fallback) => {
        const rules = rulesMap.get(employeeId);
        if (!rules || rules[field] == null) return fallback;
        return rules[field];
    };

    const canAssignShift = (employeeId, shift, weekendGroupIndex = null) => {
        const dateKey = toDateKey(shift.scheduleDate);
        if (!dateKey) return false;

        const blocked = absenceMap.get(employeeId);
        if (blocked && blocked.has(dateKey)) {
            return false;
        }

        const availableDates = availabilityMap.get(employeeId);
        if (availableDates && availableDates.size > 0 && !availableDates.has(dateKey)) {
            return false;
        }

        const otherDates = otherServiceDates.get(employeeId);
        if (otherDates && otherDates.has(dateKey)) {
            return false;
        }

        if (!assignedDatesByEmployee.has(employeeId)) {
            assignedDatesByEmployee.set(employeeId, new Set());
        }
        if (assignedDatesByEmployee.get(employeeId).has(dateKey)) {
            return false;
        }

        const maxMonthlyHours = Number(getRuleValue(employeeId, 'maxMonthlyHours', 0));
        if (maxMonthlyHours > 0) {
            const nextHours = (assignedHours.get(employeeId) || 0) + Number(shift.hours || 0);
            if (nextHours > maxMonthlyHours) {
                return false;
            }
        }

        const minRestHours = Number(getRuleValue(employeeId, 'minRestHours', 0));
        const requiredRestHours = Math.max(minRestHours, 12);
        if (requiredRestHours > 0) {
            const startTime = toDateTime(dateKey, shift.startTime);
            const endTime = toDateTime(dateKey, shift.endTime);
            const endAdjusted =
                shift.endTime && shift.startTime && shift.endTime < shift.startTime
                    ? addDays(endTime, 1)
                    : endTime;

            const existingTimes = employeeShiftTimes.get(employeeId) || [];
            for (const existing of existingTimes) {
                const existingStart = toDateTime(existing.dateKey, existing.startTime);
                const existingEndRaw = toDateTime(existing.dateKey, existing.endTime);
                const existingEnd =
                    existing.endTime && existing.startTime && existing.endTime < existing.startTime
                        ? addDays(existingEndRaw, 1)
                        : existingEndRaw;

                if (startTime >= existingEnd) {
                    const rest = (startTime - existingEnd) / 3600000;
                    if (rest < requiredRestHours) return false;
                } else if (existingStart >= endAdjusted) {
                    const rest = (existingStart - endAdjusted) / 3600000;
                    if (rest < requiredRestHours) return false;
                } else {
                    return false;
                }
            }
        }

        const candidateDay = toDateNumber(dateKey);
        if (candidateDay != null) {
            const allDates = new Set();
            const assignedDates = assignedDatesByEmployee.get(employeeId);
            const otherAssignedDates = otherServiceDates.get(employeeId);
            if (assignedDates) {
                assignedDates.forEach((key) => allDates.add(key));
            }
            if (otherAssignedDates) {
                otherAssignedDates.forEach((key) => allDates.add(key));
            }
            allDates.add(dateKey);

            let streak = 1;
            for (let offset = 1; offset <= 6; offset += 1) {
                const prev = buildDateString(addDays(new Date(`${dateKey}T00:00:00Z`), -offset));
                if (allDates.has(prev)) {
                    streak += 1;
                } else {
                    break;
                }
            }
            for (let offset = 1; offset <= 6; offset += 1) {
                const next = buildDateString(addDays(new Date(`${dateKey}T00:00:00Z`), offset));
                if (allDates.has(next)) {
                    streak += 1;
                } else {
                    break;
                }
            }
            if (streak > 5) {
                return false;
            }
        }

        const restWeekendCount = Number(
            getRuleValue(employeeId, 'restWeekendCount', 0)
        );
        if (weekendGroupIndex !== null && restWeekendCount > 0) {
            const currentWorked = weekendWorkSet.get(employeeId) || new Set();
            const allowedWork = Math.max(totalWeekendGroups - restWeekendCount, 0);
            if (!currentWorked.has(weekendGroupIndex) && currentWorked.size >= allowedWork) {
                return false;
            }
        }

        return true;
    };

    const pickEmployee = (candidates) => {
        const scored = candidates.map((employee) => {
            const rules = rulesMap.get(employee.id);
            const minHours = Number(rules?.minMonthlyHours || 0);
            const hours = Number(assignedHours.get(employee.id) || 0);
            const hasDeficit = minHours > 0 && hours < minHours;
            return { employee, hours, hasDeficit };
        });
        scored.sort((a, b) => {
            if (a.hasDeficit !== b.hasDeficit) return a.hasDeficit ? -1 : 1;
            if (a.hours !== b.hours) return a.hours - b.hours;
            return String(a.employee.id).localeCompare(String(b.employee.id));
        });
        return scored[0]?.employee || null;
    };

    const assignShift = (shift, employeeId, weekendGroupIndex = null) => {
        shift.employeeId = employeeId;
        const dateKey = toDateKey(shift.scheduleDate);
        assignedHours.set(
            employeeId,
            (assignedHours.get(employeeId) || 0) + Number(shift.hours || 0)
        );
        if (!assignedDatesByEmployee.has(employeeId)) {
            assignedDatesByEmployee.set(employeeId, new Set());
        }
        assignedDatesByEmployee.get(employeeId).add(dateKey);
        if (!employeeShiftTimes.has(employeeId)) {
            employeeShiftTimes.set(employeeId, []);
        }
        employeeShiftTimes.get(employeeId).push({
            dateKey,
            startTime: shift.startTime,
            endTime: shift.endTime,
        });
        if (weekendGroupIndex !== null) {
            if (!weekendWorkSet.has(employeeId)) {
                weekendWorkSet.set(employeeId, new Set());
            }
            weekendWorkSet.get(employeeId).add(weekendGroupIndex);
        }
        unassignedShiftIds.delete(shift.id);
    };

    bundleAssignments.forEach((bundle) => {
        if (bundle.shifts.some((shift) => !unassignedShiftIds.has(shift.id))) {
            return;
        }
        const candidates = assignedEmployees.filter((employee) =>
            bundle.shifts.every((shift) =>
                canAssignShift(employee.id, shift, bundle.groupIndex)
            )
        );
        const selected = pickEmployee(candidates);
        if (!selected) return;
        bundle.shifts.forEach((shift) => {
            assignShift(shift, selected.id, bundle.groupIndex);
        });
    });

    const remainingShifts = simulatedShifts.filter((shift) => unassignedShiftIds.has(shift.id));
    remainingShifts.sort((a, b) => {
        const aDate = a.scheduleDate || '';
        const bDate = b.scheduleDate || '';
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });

    remainingShifts.forEach((shift) => {
        const dateKey = toDateKey(shift.scheduleDate);
        const weekendGroupIndex = weekendGroups.findIndex((group) =>
            isWeekendGroupDate(dateKey, group)
        );
        const candidates = assignedEmployees.filter((employee) =>
            canAssignShift(
                employee.id,
                shift,
                weekendGroupIndex >= 0 ? weekendGroupIndex : null
            )
        );
        const selected = pickEmployee(candidates);
        if (!selected) return;
        assignShift(shift, selected.id, weekendGroupIndex >= 0 ? weekendGroupIndex : null);
    });

    return {
        month,
        shifts: simulatedShifts,
        employees: assignedEmployees,
    };
};

export default simulateServiceScheduleService;
