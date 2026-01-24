import { useMemo, useState } from 'react';
import './ServiceScheduleGrid.css';

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (year, monthIndex, day) =>
    `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

const dateToKey = (date) =>
    toDateKey(date.getFullYear(), date.getMonth(), date.getDate());

const normalizeDateKey = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return dateToKey(value);
    }
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
        return match[1];
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return dateToKey(parsed);
    }
    return null;
};

const parseDateKey = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const isDateInRange = (date, start, end) => {
    if (!date || !start) return false;
    if (!end) return date.getTime() === start.getTime();
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
};

const absenceColor = (type) => {
    if (type === 'vacation') return '#fde68a';
    if (type === 'free') return '#c7d2fe';
    if (type === 'sick') return '#fecaca';
    return '#e2e8f0';
};

const weekdayLabel = (date) => {
    const labels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    return labels[date.getDay()] || '';
};

const formatTime = (value) => {
    if (!value) return '';
    const [hours, minutes] = String(value).split(':');
    if (hours == null || minutes == null) return value;
    return `${hours}:${minutes}`;
};

const ServiceScheduleGrid = ({
    month,
    shifts,
    employees,
    absencesByEmployee,
    onShiftUpdate,
    onSelectShift,
    readOnly = false,
    showUnassigned = true,
}) => {
    const [draggedShiftId, setDraggedShiftId] = useState(null);

    const { days, year, monthIndex } = useMemo(() => {
        if (!month) {
            return { days: [], year: 0, monthIndex: 0 };
        }
        const [yearString, monthString] = month.split('-');
        const yearValue = Number(yearString);
        const monthValue = Number(monthString) - 1;
        if (!yearValue || monthValue < 0) {
            return { days: [], year: 0, monthIndex: 0 };
        }
        const totalDays = new Date(yearValue, monthValue + 1, 0).getDate();
        return {
            days: Array.from({ length: totalDays }, (_, idx) => idx + 1),
            year: yearValue,
            monthIndex: monthValue,
        };
    }, [month]);

    const { shiftMap, bucketed } = useMemo(() => {
        const map = new Map();
        const buckets = new Map();
        (shifts || []).forEach((shift) => {
            const scheduleKey = normalizeDateKey(shift?.scheduleDate);
            if (!scheduleKey) return;
            const normalizedShift = { ...shift, scheduleDate: scheduleKey };
            map.set(shift.id, normalizedShift);
            const key = `${shift.employeeId || 'unassigned'}_${scheduleKey}`;
            if (!buckets.has(key)) {
                buckets.set(key, []);
            }
            buckets.get(key).push(normalizedShift);
        });
        return { shiftMap: map, bucketed: buckets };
    }, [shifts]);

    const rows = useMemo(() => {
        const base = employees.map((employee) => ({
            id: employee.id,
            label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        }));
        return showUnassigned ? [{ id: null, label: 'Sin asignar' }, ...base] : base;
    }, [employees, showUnassigned]);

    const handleDragStart = (event, shiftId) => {
        setDraggedShiftId(shiftId);
        event.dataTransfer.setData('text/plain', shiftId);
    };

    const handleDragEnd = () => {
        setDraggedShiftId(null);
    };

    const handleDrop = (event, employeeId, day) => {
        if (readOnly) return;
        event.preventDefault();
        const shiftId = event.dataTransfer.getData('text/plain') || draggedShiftId;
        if (!shiftId) return;
        const shift = shiftMap.get(shiftId);
        if (!shift) return;
        const nextDate = toDateKey(year, monthIndex, day);
        const currentDate = normalizeDateKey(shift.scheduleDate);
        if (currentDate === nextDate && shift.employeeId === employeeId) {
            return;
        }
        onShiftUpdate(shiftId, {
            scheduleDate: nextDate,
            employeeId,
        });
    };

    const allowDrop = (event) => {
        if (!readOnly) {
            event.preventDefault();
        }
    };

    const gridStyle = { '--days': days.length };

    return (
        <div className='service-schedule-grid'>
            <div className='service-schedule-grid-head' style={gridStyle}>
                <div className='service-schedule-grid-corner'>Empleado</div>
                {days.map((day) => {
                    const dateObj = new Date(year, monthIndex, day);
                    return (
                        <div key={`weekday-${day}`} className='service-schedule-grid-weekday'>
                            {weekdayLabel(dateObj)}
                        </div>
                    );
                })}
            </div>
            <div className='service-schedule-grid-head service-schedule-grid-head--numbers' style={gridStyle}>
                <div className='service-schedule-grid-corner'> </div>
                {days.map((day) => (
                    <div key={`day-${day}`} className='service-schedule-grid-day'>
                        {day}
                    </div>
                ))}
            </div>
            {rows.map((row) => {
                const rowAbsences = row.id ? absencesByEmployee[row.id] || [] : [];
                return (
                    <div
                        className='service-schedule-grid-row'
                        key={row.id || 'unassigned'}
                        style={gridStyle}
                    >
                        <div className='service-schedule-grid-employee'>{row.label}</div>
                        {days.map((day) => {
                            const dateKey = toDateKey(year, monthIndex, day);
                            const bucketKey = `${row.id || 'unassigned'}_${dateKey}`;
                            const shiftsForDay = bucketed.get(bucketKey) || [];
                            const dateObj = new Date(year, monthIndex, day);
                            const absence = rowAbsences.find((item) => {
                                const start = parseDateKey(item.startDate);
                                const end = parseDateKey(item.endDate);
                                return isDateInRange(dateObj, start, end);
                            });

                            return (
                                <div
                                    key={dateKey}
                                    className='service-schedule-grid-cell'
                                    onDrop={(event) => handleDrop(event, row.id, day)}
                                    onDragOver={allowDrop}
                                    style={
                                        absence
                                            ? { backgroundColor: absenceColor(absence.type) }
                                            : undefined
                                    }
                                >
                                    {absence && !shiftsForDay.length && (
                                        <span className='service-schedule-grid-absence'>
                                            {absence.type === 'vacation' ? 'Vacaciones' : 'Libre'}
                                        </span>
                                    )}
                                    {shiftsForDay.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className='service-schedule-grid-shift'
                                            style={{
                                                backgroundColor:
                                                    shift.shiftTypeColor || '#cbd5f5',
                                            }}
                                            draggable={!readOnly}
                                            onDragStart={(event) =>
                                                readOnly
                                                    ? undefined
                                                    : handleDragStart(event, shift.id)
                                            }
                                            onDragEnd={readOnly ? undefined : handleDragEnd}
                                            onClick={() => onSelectShift?.(shift)}
                                        >
                                            <span className='service-schedule-grid-shift-time'>
                                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                            </span>
                                            {shift.shiftTypeName && (
                                                <span className='service-schedule-grid-shift-type'>
                                                    {shift.shiftTypeName}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default ServiceScheduleGrid;
