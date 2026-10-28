import { useEffect, useState } from 'react';
import { salaryCalendarDays } from './salaryCalendarDays.js';

const money = (value) =>
    Number(value || 0).toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
    });

const absenceLabel = (type) => {
    if (type === 'vacation') return 'Vacaciones';
    if (type === 'sick') return 'Baja';
    if (type === 'off') return 'Libre';
    return 'Ausencia';
};

const SalaryInteractiveCalendar = ({ month, employee, busy, onApply }) => {
    const [selected, setSelected] = useState([]);
    const [hourlyRate, setHourlyRate] = useState('');
    const [amountType, setAmountType] = useState('gross');
    const calendar = employee.calendar || [];
    const days = salaryCalendarDays(month);
    const chosen = calendar.filter((shift) => selected.includes(shift.id));

    useEffect(() => setSelected([]), [month, employee.employeeId]);

    const toggle = (ids) => {
        setSelected((current) =>
            ids.every((id) => current.includes(id))
                ? current.filter((id) => !ids.includes(id))
                : [...new Set([...current, ...ids])]
        );
    };

    const apply = async (action) => {
        if (!chosen.length) return;
        const saved = await onApply({
            employeeId: employee.employeeId,
            settlementMonth: month,
            shiftIds: chosen.map((shift) => shift.id),
            action,
            ...(action === 'rate'
                ? { hourlyRate: Number(hourlyRate), amountType }
                : {}),
        });
        if (saved) setSelected([]);
    };

    return (
        <article className='salary-card salary-calendar-card'>
            <div className='salary-worker-head'>
                <div>
                    <h3>{employee.employeeName}</h3>
                    <p>
                        {employee.delegation || 'Sin delegacion'} · {employee.totalHours} h ·{' '}
                        {money(employee.totalAmount)}
                    </p>
                </div>
                <label className='salary-calendar-check'>
                    <input
                        type='checkbox'
                        disabled={busy || !calendar.length}
                        checked={calendar.length > 0 && chosen.length === calendar.length}
                        onChange={() => toggle(calendar.map((shift) => shift.id))}
                    />
                    Todo el mes
                </label>
            </div>

            <div className='salary-calendar-toolbar'>
                <span>
                    {chosen.length} turnos ·{' '}
                    {chosen.reduce((sum, shift) => sum + Number(shift.hours || 0), 0)} h
                </span>
                <button type='button' disabled={busy || !chosen.length} onClick={() => apply('paid')}>
                    Marcar pagado
                </button>
                <button type='button' disabled={busy || !chosen.length} onClick={() => apply('pending')}>
                    Marcar pendiente
                </button>
                <label>
                    Tarifa final €/h
                    <input
                        type='number'
                        min='0'
                        max='1000000'
                        step='0.01'
                        value={hourlyRate}
                        disabled={busy}
                        onChange={(event) => setHourlyRate(event.target.value)}
                    />
                </label>
                <label>
                    Importe
                    <select
                        value={amountType}
                        disabled={busy}
                        onChange={(event) => setAmountType(event.target.value)}
                    >
                        <option value='gross'>Bruto</option>
                        <option value='net'>Neto pactado</option>
                    </select>
                </label>
                <button
                    type='button'
                    disabled={busy || !chosen.length || hourlyRate === ''}
                    onClick={() => apply('rate')}
                >
                    Aplicar tarifa
                </button>
                <button type='button' disabled={busy || !chosen.length} onClick={() => apply('reset-rate')}>
                    Restablecer tarifa
                </button>
            </div>

            <div className='salary-calendar-scroll'>
                <div className='salary-calendar-grid'>
                    {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                        <strong className='salary-calendar-weekday' key={day}>{day}</strong>
                    ))}
                    {days.map((date, index) => {
                        const shifts = date ? calendar.filter((shift) => shift.date === date) : [];
                        const absences = date
                            ? (employee.absences || []).filter(
                                  (absence) => date >= absence.startDate && date <= absence.endDate
                              )
                            : [];
                        return (
                            <div
                                key={date || `empty-${index}`}
                                className={`salary-calendar-day${index % 7 > 4 ? ' is-weekend' : ''}`}
                            >
                                {date ? (
                                    <>
                                        <div className='salary-calendar-day__head'>
                                            <strong>{Number(date.slice(-2))}</strong>
                                            {shifts.length ? (
                                                <input
                                                    type='checkbox'
                                                    disabled={busy}
                                                    checked={shifts.every((shift) => selected.includes(shift.id))}
                                                    onChange={() => toggle(shifts.map((shift) => shift.id))}
                                                />
                                            ) : null}
                                        </div>
                                        {shifts.map((shift) => (
                                            <label
                                                className={`salary-calendar-shift${Number(shift.paidHours) >= Number(shift.hours) ? ' is-paid' : ''}`}
                                                key={shift.id}
                                            >
                                                <input
                                                    type='checkbox'
                                                    disabled={busy}
                                                    checked={selected.includes(shift.id)}
                                                    onChange={() => toggle([shift.id])}
                                                />
                                                <span>{shift.startTime}-{shift.endTime}{shift.overnight ? ' +1d' : ''}</span>
                                                <small>{shift.serviceName}</small>
                                                <small>{shift.hours} h{shift.hourlyRate !== null ? ` · ${money(shift.hourlyRate)}/h` : ''}</small>
                                                <small>{Number(shift.paidHours) >= Number(shift.hours) ? 'Pagado' : Number(shift.paidHours) > 0 ? `${shift.paidHours} h pagadas` : 'Pendiente'}</small>
                                            </label>
                                        ))}
                                        {absences.map((absence) => (
                                            <small className='salary-calendar-absence' key={absence.id}>
                                                {absenceLabel(absence.type)}
                                            </small>
                                        ))}
                                    </>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </article>
    );
};

export default SalaryInteractiveCalendar;
