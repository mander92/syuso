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

const getAbsenceRange = (absence) => {
    if (!absence) return { start: null, end: null };
    const startKey = normalizeDateKey(absence.startDate);
    const endKey = normalizeDateKey(absence.endDate);
    return {
        start: parseDateKey(startKey),
        end: parseDateKey(endKey),
    };
};

const isDateInRange = (date, start, end) => {
    if (!date || !start) return false;
    if (!end) return date.getTime() === start.getTime();
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
};

const absenceColor = (type) => {
    if (type === 'vacation') return '#fde68a';
    if (type === 'free' || type === 'leave') return '#c7d2fe';
    if (type === 'sick') return '#fecaca';
    if (type === 'available') return '#bbf7d0';
    return '#e2e8f0';
};

const absenceLabel = (type) => {
    if (type === 'vacation') return 'Vacaciones';
    if (type === 'free' || type === 'leave') return 'Libre';
    if (type === 'sick') return 'Baja';
    if (type === 'available') return 'Disponible';
    return 'Ausencia';
};

const absenceShort = (type) => {
    if (type === 'vacation') return 'V';
    if (type === 'free' || type === 'leave') return 'L';
    if (type === 'sick') return 'B';
    if (type === 'available') return 'D';
    return 'A';
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

const formatHours = (value) => {
    const number = Number(value) || 0;
    return number.toFixed(2);
};

const ServiceScheduleGrid = ({
    month,
    shifts,
    employees,
    absencesByEmployee,
    onShiftUpdate,
    onSelectShift,
    onCreateShift,
    onCopyShift,
    onPasteShift,
    onDeleteShift,
    onHolidayDrop,
    onHolidayClick,
    holidaysByDate = {},
    copiedShift = null,
    requestBadgesByCell = {},
    readOnly = false,
    showUnassigned = true,
    showAllEmployees = false,
    showAgreementHours = false,
}) => {
    const [draggedShiftId, setDraggedShiftId] = useState(null);
    const [collapsedRows, setCollapsedRows] = useState(() => new Set());

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
        const employeesWithShifts = new Set();
        let hasUnassignedShifts = false;

        (shifts || []).forEach((shift) => {
            if (shift?.employeeId) {
                employeesWithShifts.add(shift.employeeId);
            } else {
                hasUnassignedShifts = true;
            }
        });

        const base = employees
            .filter(
                (employee) =>
                    showAllEmployees || employeesWithShifts.has(employee.id)
            )
            .map((employee) => ({
                id: employee.id,
                label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            }));

        return showUnassigned && hasUnassignedShifts
            ? [{ id: null, label: 'Sin asignar' }, ...base]
            : base;
    }, [employees, shifts, showAllEmployees, showUnassigned]);

    const rowTotals = useMemo(() => {
        const totals = new Map();
        rows.forEach((row) => {
            totals.set(row.id || 'unassigned', 0);
        });
        (shifts || []).forEach((shift) => {
            const key = shift.employeeId || 'unassigned';
            if (!totals.has(key)) return;
            totals.set(key, totals.get(key) + (Number(shift.hours) || 0));
        });
        return totals;
    }, [rows, shifts]);

    const agreementTotals = useMemo(() => {
        const totals = new Map();
        rows.forEach((row) => {
            totals.set(row.id || 'unassigned', {
                nightHours: 0,
                holidayHours: 0,
                regularHours: 0,
            });
        });
        (shifts || []).forEach((shift) => {
            const key = shift.employeeId || 'unassigned';
            if (!totals.has(key)) return;
            const current = totals.get(key);
            current.nightHours += Number(shift.nightHours) || 0;
            current.holidayHours += Number(shift.holidayHours) || 0;
            current.regularHours += Number(shift.regularHours) || 0;
        });
        return totals;
    }, [rows, shifts]);

    const shouldShowAgreementHours = useMemo(
        () => Boolean(showAgreementHours),
        [showAgreementHours]
    );

    const visibleTotalHours = useMemo(
        () => Array.from(rowTotals.values()).reduce((acc, value) => acc + value, 0),
        [rowTotals]
    );

    const visibleAgreementTotals = useMemo(
        () =>
            Array.from(agreementTotals.values()).reduce(
                (acc, value) => ({
                    nightHours: acc.nightHours + value.nightHours,
                    holidayHours: acc.holidayHours + value.holidayHours,
                    regularHours: acc.regularHours + value.regularHours,
                }),
                { nightHours: 0, holidayHours: 0, regularHours: 0 }
            ),
        [agreementTotals]
    );

    const handleDragStart = (event, shiftId) => {
        setDraggedShiftId(shiftId);
        event.dataTransfer.setData('text/plain', shiftId);
    };

    const handleDragEnd = () => {
        setDraggedShiftId(null);
    };

    const handleDrop = (event, employeeId, day) => {
        event.preventDefault();
        const holidayScope = event.dataTransfer.getData('application/x-holiday-scope');
        if (holidayScope && onHolidayDrop) {
            onHolidayDrop(toDateKey(year, monthIndex, day), holidayScope);
            return;
        }
        if (readOnly) return;
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
        if (!readOnly || onHolidayDrop) {
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
                    const dateKey = toDateKey(year, monthIndex, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isHoliday = (holidaysByDate[dateKey] || []).length > 0;
                    return (
                        <div
                            key={`weekday-${day}`}
                            className={`service-schedule-grid-weekday ${
                                isWeekend || isHoliday
                                    ? 'service-schedule-grid-date--holiday'
                                    : ''
                            }`}
                        >
                            <span className='service-schedule-grid-weekday-text'>
                                {weekdayLabel(dateObj)}
                            </span>
                            <span className='service-schedule-grid-weekday-number'>
                                {day}
                            </span>
                        </div>
                    );
                })}
                <div className='service-schedule-grid-total-head'>Horas</div>
            </div>
            <div className='service-schedule-grid-head service-schedule-grid-head--numbers' style={gridStyle}>
                <div className='service-schedule-grid-corner'> </div>
                {days.map((day) => {
                    const dateObj = new Date(year, monthIndex, day);
                    const dateKey = toDateKey(year, monthIndex, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isHoliday = (holidaysByDate[dateKey] || []).length > 0;
                    return (
                        <div
                            key={`day-${day}`}
                            className={`service-schedule-grid-day ${
                                isWeekend || isHoliday
                                    ? 'service-schedule-grid-date--holiday'
                                    : ''
                            }`}
                        >
                            {day}
                        </div>
                    );
                })}
                <div className='service-schedule-grid-total-head'>Total</div>
            </div>
            {rows.map((row) => {
                const rowKey = row.id || 'unassigned';
                const isCollapsed = collapsedRows.has(rowKey);
                const rowAbsences = row.id ? absencesByEmployee[row.id] || [] : [];
                const rowTotalHours = rowTotals.get(rowKey) || 0;
                const rowAgreementTotals = agreementTotals.get(rowKey) || {
                    nightHours: 0,
                    holidayHours: 0,
                    regularHours: 0,
                };
                return (
                    <div
                        className={`service-schedule-grid-row ${
                            isCollapsed ? 'service-schedule-grid-row--collapsed' : ''
                        }`}
                        key={rowKey}
                        style={gridStyle}
                    >
                        <div className='service-schedule-grid-employee'>
                            <span>{row.label}</span>
                            <strong className='service-schedule-grid-mobile-total'>
                                {formatHours(rowTotalHours)} h
                            </strong>
                            <button
                                type='button'
                                className='service-schedule-grid-toggle'
                                onClick={() => {
                                    setCollapsedRows((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(rowKey)) {
                                            next.delete(rowKey);
                                        } else {
                                            next.add(rowKey);
                                        }
                                        return next;
                                    });
                                }}
                                aria-label={
                                    isCollapsed
                                        ? 'Mostrar cuadrante'
                                        : 'Ocultar cuadrante'
                                }
                            >
                                {isCollapsed ? '+' : '-'}
                            </button>
                        </div>
                        {!isCollapsed &&
                            days.map((day) => {
                            const dateKey = toDateKey(year, monthIndex, day);
                            const bucketKey = `${row.id || 'unassigned'}_${dateKey}`;
                            const shiftsForDay = bucketed.get(bucketKey) || [];
                            const holidaysForDay = holidaysByDate[dateKey] || [];
                            const dateObj = new Date(year, monthIndex, day);
                            const requestBadges =
                                requestBadgesByCell[bucketKey] || [];
                            const absencesForDay = rowAbsences.filter((item) => {
                                const { start, end } = getAbsenceRange(item);
                                return isDateInRange(dateObj, start, end);
                            });
                            const primaryAbsence = absencesForDay[0];

                            return (
                                <div
                                    key={dateKey}
                                    className={`service-schedule-grid-cell ${
                                        holidaysForDay.length
                                            ? 'service-schedule-grid-cell--holiday'
                                            : ''
                                    }`}
                                    onDrop={(event) => handleDrop(event, row.id, day)}
                                    onDragOver={allowDrop}
                                    style={
                                        primaryAbsence
                                            ? {
                                                  backgroundColor: absenceColor(
                                                      primaryAbsence.type
                                                  ),
                                              }
                                            : undefined
                                    }
                                >
                                    <span className='service-schedule-grid-day-label'>
                                        {weekdayLabel(dateObj)} {day}
                                    </span>
                                    {holidaysForDay.length > 0 && (
                                        <button
                                            type='button'
                                            className='service-schedule-grid-holiday'
                                            onClick={() =>
                                                onHolidayClick?.(holidaysForDay[0])
                                            }
                                            title={holidaysForDay
                                                .map((holiday) => holiday.name)
                                                .join(', ')}
                                        >
                                            F
                                        </button>
                                    )}
                                    {absencesForDay.map((absence) => (
                                        <span
                                            key={
                                                absence.id ||
                                                `${absence.type}-${dateKey}`
                                            }
                                            className={`service-schedule-grid-absence service-schedule-grid-absence--${absence.type || 'other'}`}
                                            title={[
                                                absenceLabel(absence.type),
                                                absence.notes,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        >
                                            <span className='service-schedule-grid-absence-short'>
                                                {absenceShort(absence.type)}
                                            </span>
                                        </span>
                                    ))}
                                    {requestBadges.map((badge) => (
                                        <span
                                            key={badge.id}
                                            className={`service-schedule-grid-request service-schedule-grid-request--${badge.status || 'pending'}`}
                                            title={badge.title || badge.label}
                                        >
                                            {badge.label}
                                        </span>
                                    ))}
                                    {!readOnly && (
                                        <div className='service-schedule-grid-cell-actions'>
                                            <button
                                                type='button'
                                                className='service-schedule-grid-action'
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onCreateShift?.({
                                                        employeeId: row.id || '',
                                                        scheduleDate: dateKey,
                                                    });
                                                }}
                                                title='Anadir turno'
                                            >
                                                +
                                            </button>
                                            {copiedShift && (
                                                <button
                                                    type='button'
                                                    className='service-schedule-grid-action'
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onPasteShift?.({
                                                            employeeId:
                                                                row.id || '',
                                                            scheduleDate:
                                                                dateKey,
                                                        });
                                                    }}
                                                    title='Pegar turno'
                                                >
                                                    P
                                                </button>
                                            )}
                                        </div>
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
                                            {!readOnly && (
                                                <span className='service-schedule-grid-shift-actions'>
                                                    <button
                                                        type='button'
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onCopyShift?.(shift);
                                                        }}
                                                        title='Copiar turno'
                                                    >
                                                        C
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onDeleteShift?.(shift);
                                                        }}
                                                        title='Borrar turno'
                                                    >
                                                        X
                                                    </button>
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                            })}
                        <div className='service-schedule-grid-row-total'>
                            <strong>{formatHours(rowTotalHours)} h</strong>
                            {shouldShowAgreementHours && (
                                <span className='service-schedule-grid-agreement-total'>
                                    N {formatHours(rowAgreementTotals.nightHours)} / F{' '}
                                    {formatHours(rowAgreementTotals.holidayHours)}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
            <div className='service-schedule-grid-footer' style={gridStyle}>
                <div className='service-schedule-grid-footer-label'>Total horas</div>
                <div className='service-schedule-grid-footer-spacer' />
                <div className='service-schedule-grid-footer-total'>
                    <strong>{formatHours(visibleTotalHours)} h</strong>
                    {shouldShowAgreementHours && (
                        <span className='service-schedule-grid-agreement-total'>
                            N {formatHours(visibleAgreementTotals.nightHours)} / F{' '}
                            {formatHours(visibleAgreementTotals.holidayHours)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceScheduleGrid;
