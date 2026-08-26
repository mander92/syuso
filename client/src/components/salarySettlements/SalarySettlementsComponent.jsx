import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    createSalaryAdjustment,
    deleteSalaryAdjustment,
    fetchSalarySettlements,
    saveSalaryRate,
} from '../../services/salarySettlementService.js';
import './SalarySettlementsComponent.css';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const formatMoney = (value) =>
    new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(Number(value) || 0);

const employeeName = (employee) =>
    employee.employeeName ||
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email ||
    'Trabajador';

const serviceLabel = (service) =>
    service.name || service.type || service.serviceName || 'Servicio';

const emptyRateForm = {
    serviceId: '',
    employeeId: '',
    payMode: 'hourly',
    amountType: 'gross',
    regularRate: '',
    nightRate: '',
    holidayRate: '',
    extraRate: '',
    fixedAmount: '',
    notes: '',
};

const SalarySettlementsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [filters, setFilters] = useState({
        month: getCurrentMonth(),
        employeeId: '',
    });
    const [data, setData] = useState({
        employees: [],
        workerOptions: [],
        serviceOptions: [],
        rates: [],
        adjustments: [],
    });
    const [rateForm, setRateForm] = useState(emptyRateForm);
    const [adjustmentForm, setAdjustmentForm] = useState({
        employeeId: '',
        serviceId: '',
        settlementMonth: getCurrentMonth(),
        concept: '',
        quantity: '1',
        unitRate: '',
        amount: '',
        amountType: 'gross',
        notes: '',
    });
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
    }, [authToken, filters.month, filters.employeeId]);

    const handleSaveRate = async (event) => {
        event.preventDefault();
        if (!rateForm.serviceId) {
            toast.error('Selecciona un servicio');
            return;
        }
        setSaving(true);
        try {
            await saveSalaryRate(authToken, rateForm);
            setRateForm(emptyRateForm);
            await loadData();
            toast.success('Tarifa guardada');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar la tarifa');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateAdjustment = async (event) => {
        event.preventDefault();
        if (!adjustmentForm.employeeId || !adjustmentForm.concept) {
            toast.error('Completa trabajador y concepto');
            return;
        }
        setSaving(true);
        try {
            await createSalaryAdjustment(authToken, {
                ...adjustmentForm,
                settlementMonth: filters.month,
            });
            setAdjustmentForm((prev) => ({
                ...prev,
                employeeId: '',
                serviceId: '',
                concept: '',
                quantity: '1',
                unitRate: '',
                amount: '',
                notes: '',
            }));
            await loadData();
            toast.success('Ajuste añadido');
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
                            }))
                        }
                    />
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
                <form className='salary-card' onSubmit={handleSaveRate}>
                    <h3>Tarifa guardada</h3>
                    <label>
                        Servicio
                        <select
                            value={rateForm.serviceId}
                            onChange={(event) =>
                                setRateForm((prev) => ({
                                    ...prev,
                                    serviceId: event.target.value,
                                }))
                            }
                        >
                            <option value=''>Selecciona</option>
                            {(data.serviceOptions || []).map((service) => (
                                <option key={service.id} value={service.id}>
                                    {serviceLabel(service)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Trabajador concreto
                        <select
                            value={rateForm.employeeId}
                            onChange={(event) =>
                                setRateForm((prev) => ({
                                    ...prev,
                                    employeeId: event.target.value,
                                }))
                            }
                        >
                            <option value=''>Todos en ese servicio</option>
                            {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employeeName(employee)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className='salary-grid salary-grid--compact'>
                        <label>
                            Modo
                            <select
                                value={rateForm.payMode}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        payMode: event.target.value,
                                    }))
                                }
                            >
                                <option value='hourly'>Por horas</option>
                                <option value='fixed'>Fijo</option>
                            </select>
                        </label>
                        <label>
                            Tipo
                            <select
                                value={rateForm.amountType}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        amountType: event.target.value,
                                    }))
                                }
                            >
                                <option value='gross'>Bruto</option>
                                <option value='net'>Neto</option>
                            </select>
                        </label>
                        <label>
                            Hora base
                            <input
                                type='number'
                                step='0.01'
                                value={rateForm.regularRate}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        regularRate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Nocturna
                            <input
                                type='number'
                                step='0.01'
                                value={rateForm.nightRate}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        nightRate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Festiva
                            <input
                                type='number'
                                step='0.01'
                                value={rateForm.holidayRate}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        holidayRate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Fijo
                            <input
                                type='number'
                                step='0.01'
                                value={rateForm.fixedAmount}
                                onChange={(event) =>
                                    setRateForm((prev) => ({
                                        ...prev,
                                        fixedAmount: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Notas
                        <input
                            value={rateForm.notes}
                            onChange={(event) =>
                                setRateForm((prev) => ({
                                    ...prev,
                                    notes: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <button type='submit' disabled={saving}>
                        Guardar tarifa
                    </button>
                </form>

                <form className='salary-card' onSubmit={handleCreateAdjustment}>
                    <h3>Ajuste manual</h3>
                    <label>
                        Trabajador
                        <select
                            value={adjustmentForm.employeeId}
                            onChange={(event) =>
                                setAdjustmentForm((prev) => ({
                                    ...prev,
                                    employeeId: event.target.value,
                                }))
                            }
                        >
                            <option value=''>Selecciona</option>
                            {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employeeName(employee)}
                                </option>
                            ))}
                        </select>
                    </label>
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
                            {(data.serviceOptions || []).map((service) => (
                                <option key={service.id} value={service.id}>
                                    {serviceLabel(service)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Concepto
                        <input
                            value={adjustmentForm.concept}
                            placeholder='Gasolina, horas extra, plus...'
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
                        Añadir ajuste
                    </button>
                </form>
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
                                    {rate.employeeName || 'Todos los trabajadores'} ·{' '}
                                    {rate.payMode === 'fixed'
                                        ? `Fijo ${formatMoney(rate.fixedAmount)}`
                                        : `Base ${formatMoney(rate.regularRate)} / h`}
                                    {' · '}
                                    {rate.amountType === 'net' ? 'Neto' : 'Bruto'}
                                </span>
                            </div>
                            <button
                                type='button'
                                onClick={() =>
                                    setRateForm({
                                        serviceId: rate.serviceId || '',
                                        employeeId: rate.employeeId || '',
                                        payMode: rate.payMode || 'hourly',
                                        amountType: rate.amountType || 'gross',
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
                            Todavía no hay tarifas guardadas.
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
                                    {employee.delegation || 'Sin delegación'} ·{' '}
                                    {employee.dni || 'Sin DNI'} ·{' '}
                                    {employee.bankAccount || 'Sin cuenta bancaria'}
                                </p>
                            </div>
                            <strong>{formatMoney(employee.totalAmount)}</strong>
                        </div>
                        <div className='salary-mini-summary'>
                            <span>{employee.totalHours} h</span>
                            <span>Noct. {employee.nightHours} h</span>
                            <span>Fest. {employee.holidayHours} h</span>
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
                                            {service.totalHours} h ·{' '}
                                            {service.hourRuleType === 'convenio'
                                                ? `Noct. ${service.nightHours} · Fest. ${service.holidayHours}`
                                                : 'Normal'}
                                        </span>
                                    </div>
                                    <div>
                                        <span>
                                            {service.amountType === 'net'
                                                ? 'Neto'
                                                : 'Bruto'}
                                        </span>
                                        <strong>{formatMoney(service.amount)}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
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
        </section>
    );
};

export default SalarySettlementsComponent;
