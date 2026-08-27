import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    createSalaryAdjustment,
    deleteSalaryAdjustment,
    fetchSalarySettlements,
    saveSalaryAbsencePayment,
    saveSalaryRate,
} from '../../services/salarySettlementService.js';
import SalaryRateModal, { emptyRateForm } from './SalaryRateModal.jsx';
import './SalarySettlementsComponent.css';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const formatMoney = (value) =>
    new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(Number(value) || 0);

const formatHours = (value) => `${(Number(value) || 0).toFixed(2)} h`;

const employeeName = (employee) =>
    employee.employeeName ||
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email ||
    'Trabajador';

const serviceLabel = (service) =>
    service.name || service.type || service.serviceName || 'Servicio';

const getDaysInMonth = (month) => {
    const [year, monthNumber] = String(month || '').split('-').map(Number);
    if (!year || !monthNumber) return [];
    const days = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { day, date };
    });
};

const getDayKey = (value) => String(value || '').slice(0, 10);

const emptyAdjustmentForm = {
    serviceId: '',
    concept: '',
    quantity: '1',
    unitRate: '',
    amount: '',
    amountType: 'gross',
    notes: '',
};

const emptyAbsencePaymentForm = {
    absenceType: 'vacation',
    days: '',
    amount: '',
    amountType: 'gross',
    notes: '',
};

const absenceTypeLabel = (type) =>
    type === 'vacation' ? 'Vacaciones' : type === 'sick' ? 'Baja' : 'Ausencia';

const getRateText = (rate) => {
    if (rate.payMode === 'agreement') {
        return `Convenio base ${formatMoney(rate.regularRate)} / h`;
    }
    if (rate.payMode === 'fixed') return `Fijo ${formatMoney(rate.fixedAmount)}`;
    return `Base ${formatMoney(rate.regularRate)} / h`;
};

const SalarySettlementsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [filters, setFilters] = useState({
        month: getCurrentMonth(),
        employeeId: '',
        delegation: '',
        serviceId: '',
    });
    const [data, setData] = useState({
        employees: [],
        workerOptions: [],
        serviceOptions: [],
        delegationOptions: [],
        rates: [],
        adjustments: [],
    });
    const [rateForm, setRateForm] = useState(emptyRateForm);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [openAdjustmentEmployeeId, setOpenAdjustmentEmployeeId] = useState('');
    const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
    const [openAbsencePaymentKey, setOpenAbsencePaymentKey] = useState('');
    const [absencePaymentForm, setAbsencePaymentForm] = useState(
        emptyAbsencePaymentForm
    );
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const employeeOptions = useMemo(
        () =>
            (data.workerOptions || [])
                .slice()
                .sort((a, b) =>
                    employeeName(a).localeCompare(employeeName(b), 'es', {
                        sensitivity: 'base',
                    })
                ),
        [data.workerOptions]
    );

    const serviceOptions = useMemo(
        () =>
            (data.serviceOptions || [])
                .slice()
                .sort((a, b) =>
                    serviceLabel(a).localeCompare(serviceLabel(b), 'es', {
                        sensitivity: 'base',
                    })
                ),
        [data.serviceOptions]
    );

    const delegationOptions = useMemo(
        () => (data.delegationOptions || []).map((item) => item.name).filter(Boolean),
        [data.delegationOptions]
    );

    const monthDays = useMemo(() => getDaysInMonth(filters.month), [filters.month]);

    const loadData = async (generateExcel = false) => {
        if (!authToken) return;
        setLoading(true);
        try {
            const result = await fetchSalarySettlements(authToken, {
                ...filters,
                generateExcel,
            });
            setData(result);
            if (generateExcel && result.excelFilePath) {
                window.open(
                    `${import.meta.env.VITE_API_URL}${result.excelFilePath}`,
                    '_blank',
                    'noopener,noreferrer'
                );
            }
        } catch (error) {
            toast.error(error.message || 'No se pudieron calcular los sueldos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        authToken,
        filters.month,
        filters.employeeId,
        filters.serviceId,
        filters.delegation,
    ]);

    const handleSaveRate = async (event) => {
        event.preventDefault();
        if (!rateForm.serviceId) {
            toast.error('Selecciona un servicio');
            return;
        }
        setSaving(true);
        try {
            await saveSalaryRate(authToken, {
                ...rateForm,
                amountType: rateForm.payMode === 'agreement' ? 'gross' : rateForm.amountType,
            });
            setRateForm(emptyRateForm);
            setIsRateModalOpen(false);
            await loadData();
            toast.success('Tarifa guardada');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar la tarifa');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateAdjustment = async (event, employeeId) => {
        event.preventDefault();
        if (!employeeId || !adjustmentForm.concept) {
            toast.error('Completa trabajador y concepto');
            return;
        }
        setSaving(true);
        try {
            await createSalaryAdjustment(authToken, {
                ...adjustmentForm,
                employeeId,
                settlementMonth: filters.month,
            });
            setAdjustmentForm(emptyAdjustmentForm);
            setOpenAdjustmentEmployeeId('');
            await loadData();
            toast.success('Ajuste anadido');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el ajuste');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAdjustment = async (adjustmentId) => {
        if (!window.confirm('Se borrara este ajuste. Continuar?')) return;
        setSaving(true);
        try {
            await deleteSalaryAdjustment(authToken, adjustmentId);
            await loadData();
            toast.success('Ajuste borrado');
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar el ajuste');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenAbsencePayment = (employee, payment) => {
        const key = `${employee.employeeId}:${payment.absenceType}`;
        setOpenAbsencePaymentKey((prev) => (prev === key ? '' : key));
        setAbsencePaymentForm({
            absenceType: payment.absenceType,
            days: payment.days ?? payment.detectedDays ?? '',
            amount: payment.amount ?? '',
            amountType: payment.amountType || 'gross',
            notes: payment.notes || '',
        });
    };

    const handleSaveAbsencePayment = async (event, employee) => {
        event.preventDefault();
        setSaving(true);
        try {
            await saveSalaryAbsencePayment(authToken, {
                ...absencePaymentForm,
                employeeId: employee.employeeId,
                settlementMonth: filters.month,
            });
            setOpenAbsencePaymentKey('');
            setAbsencePaymentForm(emptyAbsencePaymentForm);
            await loadData();
            toast.success('Ausencia actualizada');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar la ausencia');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenWorkerAdjustment = (employee) => {
        setOpenAdjustmentEmployeeId((prev) =>
            prev === employee.employeeId ? '' : employee.employeeId
        );
        setAdjustmentForm(emptyAdjustmentForm);
    };

    const handleEditWorkerRate = (employee, service) => {
        const rate = service.rate || {};
        setRateForm({
            serviceId: service.serviceId || '',
            employeeId: employee.employeeId || '',
            payMode: rate.payMode || 'hourly',
            amountType: rate.payMode === 'agreement' ? 'gross' : rate.amountType || 'gross',
            regularRate: rate.regularRate ?? '',
            nightRate: rate.nightRate ?? '',
            holidayRate: rate.holidayRate ?? '',
            extraRate: rate.extraRate ?? '',
            fixedAmount: rate.fixedAmount ?? '',
            notes: rate.notes || '',
        });
        setIsRateModalOpen(true);
    };

    const handleOpenRateModal = (rate = emptyRateForm) => {
        setRateForm({
            ...emptyRateForm,
            ...rate,
            amountType: rate.payMode === 'agreement' ? 'gross' : rate.amountType || 'gross',
        });
        setIsRateModalOpen(true);
    };

    const renderServiceCalendar = (employee, service) => {
        const shiftsByDate = (employee.calendar || [])
            .filter((shift) => shift.serviceId === service.serviceId)
            .reduce((acc, shift) => {
            const key = getDayKey(shift.date);
            if (!acc[key]) acc[key] = [];
            acc[key].push(shift);
            return acc;
        }, {});

        return (
            <div className='salary-service-calendar'>
                {monthDays.map(({ day, date }) => {
                    const shifts = shiftsByDate[date] || [];
                    const isWeekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
                    return (
                        <div
                            key={`${employee.employeeId}-${service.serviceId}-${date}`}
                            className={`salary-service-calendar__day${isWeekend ? ' is-weekend' : ''}`}
                        >
                            <span>{day}</span>
                            {shifts.map((shift, index) => (
                                <small key={`${shift.serviceId}-${date}-${index}`}>
                                    {shift.startTime?.slice(0, 5)}-{shift.endTime?.slice(0, 5)}
                                </small>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    const totals = useMemo(
        () =>
            (data.employees || []).reduce(
                (acc, employee) => ({
                    hours: acc.hours + (Number(employee.totalHours) || 0),
                    gross: acc.gross + (Number(employee.grossAmount) || 0),
                    net: acc.net + (Number(employee.netAmount) || 0),
                    total: acc.total + (Number(employee.totalAmount) || 0),
                    missing: acc.missing + (Number(employee.missingRates) || 0),
                }),
                { hours: 0, gross: 0, net: 0, total: 0, missing: 0 }
            ),
        [data.employees]
    );

    return (
        <section className='salary-settlements'>
            <header className='salary-settlements__header'>
                <div>
                    <h2>Sueldos</h2>
                    <p>
                        Calcula importes mensuales desde cuadrantes, tarifas de
                        servicio y ajustes manuales.
                    </p>
                </div>
                <button
                    type='button'
                    onClick={() => loadData(true)}
                    disabled={loading}
                >
                    Descargar Excel
                </button>
            </header>

            <div className='salary-settlements__filters'>
                <label>
                    Mes
                    <input
                        type='month'
                        value={filters.month}
                        onChange={(event) =>
                            setFilters((prev) => ({
                                ...prev,
                                month: event.target.value,
                                employeeId: '',
                                serviceId: '',
                            }))
                        }
                    />
                </label>
                <label>
                    Delegacion
                    <select
                        value={filters.delegation}
                        onChange={(event) =>
                            setFilters((prev) => ({
                                ...prev,
                                delegation: event.target.value,
                                employeeId: '',
                                serviceId: '',
                            }))
                        }
                    >
                        <option value=''>Todas</option>
                        {delegationOptions.map((delegation) => (
                            <option key={delegation} value={delegation}>
                                {delegation}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Servicio
                    <select
                        value={filters.serviceId}
                        onChange={(event) =>
                            setFilters((prev) => ({
                                ...prev,
                                serviceId: event.target.value,
                                employeeId: '',
                            }))
                        }
                    >
                        <option value=''>Todos</option>
                        {serviceOptions.map((service) => (
                            <option key={service.id} value={service.id}>
                                {serviceLabel(service)}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Trabajador
                    <select
                        value={filters.employeeId}
                        onChange={(event) =>
                            setFilters((prev) => ({
                                ...prev,
                                employeeId: event.target.value,
                            }))
                        }
                    >
                        <option value=''>Todos</option>
                        {employeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employeeName(employee)}
                            </option>
                        ))}
                    </select>
                </label>
                <button type='button' onClick={() => loadData()} disabled={loading}>
                    {loading ? 'Calculando...' : 'Actualizar'}
                </button>
            </div>

            <div className='salary-settlements__summary'>
                <article>
                    <span>Horas</span>
                    <strong>{totals.hours.toFixed(2)}</strong>
                </article>
                <article>
                    <span>Bruto</span>
                    <strong>{formatMoney(totals.gross)}</strong>
                </article>
                <article>
                    <span>Neto</span>
                    <strong>{formatMoney(totals.net)}</strong>
                </article>
                <article>
                    <span>Total</span>
                    <strong>{formatMoney(totals.total)}</strong>
                </article>
                <article className={totals.missing ? 'is-warning' : ''}>
                    <span>Sin tarifa</span>
                    <strong>{totals.missing}</strong>
                </article>
            </div>

            <div className='salary-settlements__forms'>
                <button
                    type='button'
                    className='salary-rate-open'
                    onClick={() => handleOpenRateModal()}
                >
                    Anadir tarifa
                </button>
            </div>

            <section className='salary-card'>
                <h3>Tarifas configuradas</h3>
                <div className='salary-rate-list'>
                    {(data.rates || []).map((rate) => (
                        <div key={rate.id} className='salary-rate-row'>
                            <div>
                                <strong>
                                    {rate.serviceName ||
                                        rate.serviceType ||
                                        'Servicio'}
                                </strong>
                                <span>
                                    {rate.employeeName || 'Todos los trabajadores'} -{' '}
                                    {getRateText(rate)} -{' '}
                                    {rate.payMode === 'agreement'
                                        ? 'Bruto convenio'
                                        : rate.amountType === 'net'
                                          ? 'Neto'
                                          : 'Bruto'}
                                </span>
                            </div>
                            <button
                                type='button'
                                onClick={() =>
                                    handleOpenRateModal({
                                        serviceId: rate.serviceId || '',
                                        employeeId: rate.employeeId || '',
                                        payMode: rate.payMode || 'hourly',
                                        amountType:
                                            rate.payMode === 'agreement'
                                                ? 'gross'
                                                : rate.amountType || 'gross',
                                        regularRate: rate.regularRate ?? '',
                                        nightRate: rate.nightRate ?? '',
                                        holidayRate: rate.holidayRate ?? '',
                                        extraRate: rate.extraRate ?? '',
                                        fixedAmount: rate.fixedAmount ?? '',
                                        notes: rate.notes || '',
                                    })
                                }
                            >
                                Editar
                            </button>
                        </div>
                    ))}
                    {!data.rates?.length ? (
                        <p className='salary-empty'>
                            Todavia no hay tarifas guardadas.
                        </p>
                    ) : null}
                </div>
            </section>

            <div className='salary-settlements__list'>
                {(data.employees || []).map((employee) => (
                    <article key={employee.employeeId} className='salary-card'>
                        <div className='salary-worker-head'>
                            <div>
                                <h3>{employee.employeeName}</h3>
                                <p>
                                    {employee.delegation || 'Sin delegacion'} -{' '}
                                    {employee.dni || 'Sin DNI'} -{' '}
                                    {employee.bankAccount || 'Sin cuenta bancaria'}
                                </p>
                            </div>
                            <strong>{formatMoney(employee.totalAmount)}</strong>
                        </div>
                        <div className='salary-worker-actions'>
                            <button
                                type='button'
                                onClick={() => handleOpenWorkerAdjustment(employee)}
                            >
                                Ajuste manual
                            </button>
                        </div>
                        <div className='salary-mini-summary'>
                            <span>{formatHours(employee.totalHours)}</span>
                            <span>Base {formatHours(employee.baseHours)}</span>
                            <span>Noct. {formatHours(employee.nightHours)}</span>
                            <span>Fest. {formatHours(employee.holidayHours)}</span>
                            <span>Extras {formatHours(employee.extraHours)}</span>
                            <span>Bruto {formatMoney(employee.grossAmount)}</span>
                            <span>Neto {formatMoney(employee.netAmount)}</span>
                        </div>
                        <div className='salary-service-list'>
                            {(employee.services || []).map((service) => (
                                <div
                                    key={`${employee.employeeId}-${service.serviceId}`}
                                    className={
                                        'salary-service-row' +
                                        (!service.rate?.id ? ' is-missing' : '')
                                    }
                                >
                                    <div>
                                        <strong>{service.serviceName}</strong>
                                        <span>
                                            {formatHours(service.totalHours)} -{' '}
                                            {service.hourRuleType === 'convenio'
                                                ? `Noct. ${formatHours(service.nightHours)} - Fest. ${formatHours(service.holidayHours)} - Extra ${formatHours(service.extraHours)}`
                                                : 'Normal'}
                                        </span>
                                    </div>
                                    {renderServiceCalendar(employee, service)}
                                    <div className='salary-service-row__actions'>
                                        <div>
                                            <span>
                                                {service.amountType === 'net'
                                                    ? 'Neto'
                                                    : 'Bruto'}
                                            </span>
                                            <strong>{formatMoney(service.amount)}</strong>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                handleEditWorkerRate(employee, service)
                                            }
                                        >
                                            Tarifa trabajador
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className='salary-absence-list'>
                            <h4>Vacaciones y bajas</h4>
                            {(employee.absencePayments || []).map((payment) => {
                                const key = `${employee.employeeId}:${payment.absenceType}`;
                                return (
                                    <div
                                        key={key}
                                        className='salary-absence-row'
                                    >
                                        <div>
                                            <strong>
                                                {absenceTypeLabel(payment.absenceType)}
                                            </strong>
                                            <span>
                                                Detectados {formatHours(payment.detectedDays).replace(' h', ' dias')} - Pagados {formatHours(payment.days).replace(' h', ' dias')}
                                            </span>
                                        </div>
                                        <div>
                                            <span>
                                                {payment.amountType === 'net'
                                                    ? 'Neto'
                                                    : 'Bruto'}
                                            </span>
                                            <strong>{formatMoney(payment.amount)}</strong>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                handleOpenAbsencePayment(
                                                    employee,
                                                    payment
                                                )
                                            }
                                        >
                                            Editar
                                        </button>
                                        {openAbsencePaymentKey === key ? (
                                            <form
                                                className='salary-absence-form'
                                                onSubmit={(event) =>
                                                    handleSaveAbsencePayment(
                                                        event,
                                                        employee
                                                    )
                                                }
                                            >
                                                <label>
                                                    Dias
                                                    <input
                                                        type='number'
                                                        step='0.01'
                                                        value={absencePaymentForm.days}
                                                        onChange={(event) =>
                                                            setAbsencePaymentForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    days: event.target.value,
                                                                })
                                                            )
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    Importe
                                                    <input
                                                        type='number'
                                                        step='0.01'
                                                        value={absencePaymentForm.amount}
                                                        onChange={(event) =>
                                                            setAbsencePaymentForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    amount: event.target.value,
                                                                })
                                                            )
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    Tipo
                                                    <select
                                                        value={
                                                            absencePaymentForm.amountType
                                                        }
                                                        onChange={(event) =>
                                                            setAbsencePaymentForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    amountType:
                                                                        event.target.value,
                                                                })
                                                            )
                                                        }
                                                    >
                                                        <option value='gross'>Bruto</option>
                                                        <option value='net'>Neto</option>
                                                    </select>
                                                </label>
                                                <label>
                                                    Notas
                                                    <input
                                                        value={absencePaymentForm.notes}
                                                        onChange={(event) =>
                                                            setAbsencePaymentForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    notes: event.target.value,
                                                                })
                                                            )
                                                        }
                                                    />
                                                </label>
                                                <button type='submit' disabled={saving}>
                                                    Guardar ausencia
                                                </button>
                                            </form>
                                        ) : null}
                                    </div>
                                );
                            })}
                            {employee.absences?.length ? (
                                <div className='salary-absence-detected'>
                                    {employee.absences.map((absence) => (
                                        <span key={absence.id}>
                                            {absenceTypeLabel(absence.type)}:{' '}
                                            {absence.days} dias ({absence.startDate} -{' '}
                                            {absence.endDate})
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        {openAdjustmentEmployeeId === employee.employeeId ? (
                            <form
                                className='salary-adjustment-form'
                                onSubmit={(event) =>
                                    handleCreateAdjustment(event, employee.employeeId)
                                }
                            >
                                <h4>Ajuste manual</h4>
                                <label>
                                    Servicio opcional
                                    <select
                                        value={adjustmentForm.serviceId}
                                        onChange={(event) =>
                                            setAdjustmentForm((prev) => ({
                                                ...prev,
                                                serviceId: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value=''>General</option>
                                        {(employee.services || []).map((service) => (
                                            <option
                                                key={service.serviceId}
                                                value={service.serviceId}
                                            >
                                                {service.serviceName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Concepto
                                    <input
                                        value={adjustmentForm.concept}
                                        placeholder='Gasolina, plus, adelanto...'
                                        onChange={(event) =>
                                            setAdjustmentForm((prev) => ({
                                                ...prev,
                                                concept: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <div className='salary-grid salary-grid--compact'>
                                    <label>
                                        Cantidad
                                        <input
                                            type='number'
                                            step='0.01'
                                            value={adjustmentForm.quantity}
                                            onChange={(event) =>
                                                setAdjustmentForm((prev) => ({
                                                    ...prev,
                                                    quantity: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>
                                    <label>
                                        Precio unidad
                                        <input
                                            type='number'
                                            step='0.01'
                                            value={adjustmentForm.unitRate}
                                            onChange={(event) =>
                                                setAdjustmentForm((prev) => ({
                                                    ...prev,
                                                    unitRate: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>
                                    <label>
                                        Importe directo
                                        <input
                                            type='number'
                                            step='0.01'
                                            value={adjustmentForm.amount}
                                            onChange={(event) =>
                                                setAdjustmentForm((prev) => ({
                                                    ...prev,
                                                    amount: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>
                                    <label>
                                        Tipo
                                        <select
                                            value={adjustmentForm.amountType}
                                            onChange={(event) =>
                                                setAdjustmentForm((prev) => ({
                                                    ...prev,
                                                    amountType: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value='gross'>Bruto</option>
                                            <option value='net'>Neto</option>
                                        </select>
                                    </label>
                                </div>
                                <label>
                                    Notas
                                    <input
                                        value={adjustmentForm.notes}
                                        onChange={(event) =>
                                            setAdjustmentForm((prev) => ({
                                                ...prev,
                                                notes: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button type='submit' disabled={saving}>
                                    Anadir ajuste
                                </button>
                            </form>
                        ) : null}
                        {employee.adjustments?.length ? (
                            <div className='salary-adjustments'>
                                <h4>Ajustes</h4>
                                {employee.adjustments.map((adjustment) => (
                                    <div
                                        key={adjustment.id}
                                        className='salary-adjustment-row'
                                    >
                                        <span>{adjustment.concept}</span>
                                        <strong>
                                            {adjustment.amountType === 'net'
                                                ? 'Neto'
                                                : 'Bruto'}{' '}
                                            {formatMoney(adjustment.amount)}
                                        </strong>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                handleDeleteAdjustment(adjustment.id)
                                            }
                                            disabled={saving}
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </article>
                ))}
                {!data.employees?.length ? (
                    <p className='salary-empty'>
                        No hay cuadrantes ni ajustes para este mes.
                    </p>
                ) : null}
            </div>
            <SalaryRateModal
                open={isRateModalOpen}
                title='Tarifa guardada'
                form={rateForm}
                onChange={setRateForm}
                onClose={() => setIsRateModalOpen(false)}
                onSubmit={handleSaveRate}
                serviceOptions={serviceOptions}
                employeeOptions={employeeOptions}
                agreement={data.agreement}
                saving={saving}
            />
        </section>
    );
};

export default SalarySettlementsComponent;
