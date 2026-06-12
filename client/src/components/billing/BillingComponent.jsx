import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    calculateBilling,
    deleteBillingRecord,
    fetchBilling,
    generateBillingInvoice,
    ignorePendingBilling,
    requestInvoice,
    sendInvoiceToClient,
} from '../../services/billingService.js';
import useUser from '../../hooks/useUser.js';
import { buildImageUrl } from '../../utils/imageUrl.js';
import './BillingComponent.css';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const getMonthRange = (month) => {
    const [year, monthNumber] = String(month || getCurrentMonth())
        .split('-')
        .map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 0);
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-ES');
};

const formatMonth = (value) => {
    if (!value || value === 'sin-mes') return 'Sin mes';
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    });
};

const formatMoney = (value) =>
    `${(Number(value) || 0).toFixed(2).replace('.', ',')} EUR`;

const buildInvoiceFileUrl = (filePath) => {
    if (!filePath) return '';
    return encodeURI(buildImageUrl(filePath));
};

const statusLabels = {
    pending_request: 'Pendiente de pedir',
    requested: 'Factura solicitada',
    invoice_received: 'Factura recibida',
    sent: 'Enviada al cliente',
    cancelled: 'Cancelada',
};

const BillingComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const currentRange = getMonthRange(getCurrentMonth());
    const [services, setServices] = useState([]);
    const [records, setRecords] = useState([]);
    const [pendingServices, setPendingServices] = useState([]);
    const [filters, setFilters] = useState({
        serviceId: '',
        status: '',
        fromDate: '',
        toDate: '',
    });
    const [requestForm, setRequestForm] = useState({
        serviceIds: [],
        periodStart: currentRange.start,
        periodEnd: currentRange.end,
        concept: '',
        concepts: {},
        vatPercent: '21',
        emails: '',
        ccEmails: '',
        notes: '',
    });
    const [serviceFilters, setServiceFilters] = useState({
        search: '',
        delegation: '',
        status: '',
        month: getCurrentMonth(),
    });
    const [calculations, setCalculations] = useState([]);
    const [sendForms, setSendForms] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const selectedServices = useMemo(
        () => services.filter((service) => requestForm.serviceIds.includes(service.id)),
        [requestForm.serviceIds, services]
    );

    const serviceDelegations = useMemo(
        () =>
            [...new Set(services.map((service) => service.province).filter(Boolean))].sort(
                (a, b) => a.localeCompare(b)
            ),
        [services]
    );

    const filteredServices = useMemo(() => {
        const search = serviceFilters.search.trim().toLowerCase();

        return services.filter((service) => {
            const serviceText = `${service.name || ''} ${service.clientName || ''} ${
                service.clientEmail || ''
            } ${service.billingConcept || ''}`.toLowerCase();
            const months = String(service.scheduleMonths || '')
                .split(',')
                .filter(Boolean);

            if (search && !serviceText.includes(search)) return false;
            if (serviceFilters.delegation && service.province !== serviceFilters.delegation) {
                return false;
            }
            if (serviceFilters.status && service.status !== serviceFilters.status) return false;
            if (serviceFilters.month && !months.includes(serviceFilters.month)) return false;

            return true;
        });
    }, [serviceFilters, services]);

    const calculationTotals = useMemo(
        () =>
            calculations.reduce(
                (acc, item) => ({
                    totalHours: acc.totalHours + (Number(item.totalHours) || 0),
                    subtotal: acc.subtotal + (Number(item.subtotal) || 0),
                    vatAmount: acc.vatAmount + (Number(item.vatAmount) || 0),
                    amount: acc.amount + (Number(item.amount) || 0),
                }),
                { totalHours: 0, subtotal: 0, vatAmount: 0, amount: 0 }
            ),
        [calculations]
    );

    const groupedRecords = useMemo(() => {
        const groups = records.reduce((acc, record) => {
            const key =
                String(record.periodStart || record.requestedAt || '').slice(0, 7) ||
                'sin-mes';
            if (!acc[key]) acc[key] = [];
            acc[key].push(record);
            return acc;
        }, {});

        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, monthRecords]) => ({
                month,
                records: monthRecords,
            }));
    }, [records]);

    const loadBilling = async () => {
        setLoading(true);
        try {
            const data = await fetchBilling(authToken, {
                ...filters,
                pendingMonth: serviceFilters.month,
            });
            setServices(data.services || []);
            setRecords(data.records || []);
            setPendingServices(data.pendingServices || []);
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar facturacion');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authToken) return;
        loadBilling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        authToken,
        filters.serviceId,
        filters.status,
        filters.fromDate,
        filters.toDate,
        serviceFilters.month,
    ]);

    const toggleService = (service) => {
        setRequestForm((prev) => {
            const selected = prev.serviceIds.includes(service.id);
            const serviceIds = selected
                ? prev.serviceIds.filter((id) => id !== service.id)
                : [...prev.serviceIds, service.id];

            return {
                ...prev,
                serviceIds,
                concepts: {
                    ...prev.concepts,
                    [service.id]:
                        prev.concepts[service.id] ||
                        service.billingConcept ||
                        service.name ||
                        '',
                },
                emails: prev.emails || service.clientEmail || '',
            };
        });
        setCalculations([]);
    };

    const selectVisibleServices = () => {
        const visibleIds = filteredServices.map((service) => service.id);
        const firstEmail = filteredServices.find((service) => service.clientEmail)?.clientEmail;
        setRequestForm((prev) => ({
            ...prev,
            serviceIds: [...new Set([...prev.serviceIds, ...visibleIds])],
            concepts: filteredServices.reduce(
                (acc, service) => ({
                    ...acc,
                    [service.id]:
                        acc[service.id] ||
                        service.billingConcept ||
                        service.name ||
                        '',
                }),
                prev.concepts
            ),
            emails: prev.emails || firstEmail || '',
        }));
        setCalculations([]);
    };

    const clearVisibleServices = () => {
        const visibleIds = new Set(filteredServices.map((service) => service.id));
        setRequestForm((prev) => ({
            ...prev,
            serviceIds: prev.serviceIds.filter((id) => !visibleIds.has(id)),
        }));
        setCalculations([]);
    };

    const setRequestMonth = (month) => {
        const range = getMonthRange(month || getCurrentMonth());
        setServiceFilters((prev) => ({ ...prev, month }));
        setRequestForm((prev) => ({
            ...prev,
            periodStart: range.start,
            periodEnd: range.end,
        }));
        setCalculations([]);
    };

    const addPendingService = (service) => {
        setRequestForm((prev) => ({
            ...prev,
            serviceIds: prev.serviceIds.includes(service.id)
                ? prev.serviceIds
                : [...prev.serviceIds, service.id],
            concepts: {
                ...prev.concepts,
                [service.id]:
                    prev.concepts[service.id] ||
                    service.billingConcept ||
                    service.name ||
                    '',
            },
            emails: prev.emails || service.clientEmail || '',
        }));
        setCalculations([]);
    };

    const handleCalculate = async () => {
        if (
            !requestForm.serviceIds.length ||
            !requestForm.periodStart ||
            !requestForm.periodEnd
        ) {
            toast.error('Selecciona servicios y periodo');
            return;
        }

        try {
            const results = await Promise.all(
                requestForm.serviceIds.map((serviceId) =>
                    calculateBilling(authToken, {
                        serviceId,
                        periodStart: requestForm.periodStart,
                        periodEnd: requestForm.periodEnd,
                        concept:
                            requestForm.concepts[serviceId] ||
                            requestForm.concept,
                        vatPercent: requestForm.vatPercent,
                    })
                )
            );
            setCalculations(results);
        } catch (error) {
            toast.error(error.message || 'No se pudo calcular la factura');
        }
    };

    const handleRequestInvoice = async (event) => {
        event.preventDefault();
        if (!requestForm.serviceIds.length) {
            toast.error('Selecciona al menos un servicio');
            return;
        }

        setSaving(true);
        try {
            const body = await requestInvoice(authToken, requestForm);
            toast.success(body.message || 'Solicitud registrada');
            setCalculations([]);
            await loadBilling();
        } catch (error) {
            toast.error(error.message || 'No se pudo solicitar la factura');
        } finally {
            setSaving(false);
        }
    };

    const handleSendInvoice = async (record) => {
        const form = sendForms[record.id] || {};
        if (!form.emails) {
            toast.error('Indica el correo del cliente');
            return;
        }
        setSaving(true);
        try {
            const body = await sendInvoiceToClient({
                authToken,
                billingRecordId: record.id,
                emails: form.emails,
                ccEmails: form.ccEmails || '',
                message: form.message || '',
                invoiceFile: form.invoiceFile,
            });
            toast.success(body.message || 'Factura enviada');
            setSendForms((prev) => ({ ...prev, [record.id]: {} }));
            await loadBilling();
        } catch (error) {
            toast.error(error.message || 'No se pudo enviar la factura');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateInvoice = async (record) => {
        const form = sendForms[record.id] || {};
        setSaving(true);
        try {
            const body = await generateBillingInvoice(authToken, record.id, {
                invoiceSeries: form.invoiceSeries || record.invoiceSeries || '1',
            });
            toast.success(body.message || 'Factura generada');
            await loadBilling();
        } catch (error) {
            toast.error(error.message || 'No se pudo generar la factura');
        } finally {
            setSaving(false);
        }
    };

    const handleIgnorePending = async (service) => {
        const confirmed = window.confirm(
            `Quitar ${service.name} de pendientes de facturar para este periodo?`
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            const body = await ignorePendingBilling(authToken, {
                serviceId: service.id,
                periodStart: requestForm.periodStart,
                periodEnd: requestForm.periodEnd,
                reason: 'Marcado manualmente como no pendiente',
            });
            toast.success(body.message || 'Pendiente quitado');
            await loadBilling();
        } catch (error) {
            toast.error(error.message || 'No se pudo quitar de pendientes');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecord = async (record) => {
        const confirmed = window.confirm(
            `¿Seguro que quieres borrar el registro de factura de ${record.serviceName}?`
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            const body = await deleteBillingRecord(authToken, record.id);
            toast.success(body.message || 'Registro borrado');
            await loadBilling();
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar el registro');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className='billing'>
            <header className='billing-header'>
                <p>Facturacion</p>
                <h2>Control de facturas</h2>
                <span>
                    Calcula importes por cuadrante, solicita facturas y registra el envio a clientes.
                </span>
            </header>

            {pendingServices.length ? (
                <div className='billing-alert'>
                    <strong>
                        {pendingServices.length} servicios pendientes de facturar en{' '}
                        {formatMonth(serviceFilters.month)}
                    </strong>
                    <div>
                        {pendingServices.slice(0, 8).map((service) => (
                            <span key={service.id} className='billing-pending-chip'>
                                <button type='button' onClick={() => addPendingService(service)}>
                                    {service.name}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => handleIgnorePending(service)}
                                    disabled={saving}
                                >
                                    Quitar
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className='billing-layout'>
                <form className='billing-card' onSubmit={handleRequestInvoice}>
                    <h3>Pedir factura</h3>
                    <div className='billing-grid'>
                        <div className='billing-field-wide'>
                            <span className='billing-label'>Servicios</span>
                            <div className='billing-service-filters'>
                                <label>
                                    Buscar
                                    <input
                                        type='search'
                                        value={serviceFilters.search}
                                        onChange={(event) =>
                                            setServiceFilters((prev) => ({
                                                ...prev,
                                                search: event.target.value,
                                            }))
                                        }
                                        placeholder='Servicio, cliente, correo...'
                                    />
                                </label>
                                <label>
                                    Delegacion
                                    <select
                                        value={serviceFilters.delegation}
                                        onChange={(event) =>
                                            setServiceFilters((prev) => ({
                                                ...prev,
                                                delegation: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value=''>Todas</option>
                                        {serviceDelegations.map((delegation) => (
                                            <option key={delegation} value={delegation}>
                                                {delegation}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Mes
                                    <input
                                        type='month'
                                        value={serviceFilters.month}
                                        onChange={(event) => setRequestMonth(event.target.value)}
                                    />
                                </label>
                                <label>
                                    Estado
                                    <select
                                        value={serviceFilters.status}
                                        onChange={(event) =>
                                            setServiceFilters((prev) => ({
                                                ...prev,
                                                status: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value=''>Todos</option>
                                        <option value='confirmed'>Confirmados</option>
                                        <option value='completed'>Completados</option>
                                    </select>
                                </label>
                            </div>
                            <div className='billing-selection-actions'>
                                <button type='button' onClick={selectVisibleServices}>
                                    Seleccionar visibles
                                </button>
                                <button type='button' onClick={clearVisibleServices}>
                                    Quitar visibles
                                </button>
                            </div>
                            <div className='billing-service-picker'>
                                {filteredServices.map((service) => (
                                    <label key={service.id} className='billing-service-option'>
                                        <input
                                            type='checkbox'
                                            checked={requestForm.serviceIds.includes(service.id)}
                                            onChange={() => toggleService(service)}
                                        />
                                        <span>{service.name}</span>
                                        <small>
                                            {service.province || 'Sin delegacion'} ·{' '}
                                            {service.clientEmail || 'Sin email de cliente'}
                                        </small>
                                    </label>
                                ))}
                                {!filteredServices.length ? (
                                    <p className='billing-muted'>No hay servicios con esos filtros.</p>
                                ) : null}
                            </div>
                            <p className='billing-muted'>
                                {selectedServices.length} servicios seleccionados ·{' '}
                                {filteredServices.length} visibles
                            </p>
                        </div>
                        {selectedServices.length ? (
                            <div className='billing-field-wide'>
                                <span className='billing-label'>Concepto por servicio</span>
                                <div className='billing-concept-list'>
                                    {selectedServices.map((service) => (
                                        <label key={service.id}>
                                            {service.name}
                                            <input
                                                type='text'
                                                value={
                                                    requestForm.concepts[service.id] ||
                                                    service.billingConcept ||
                                                    service.name ||
                                                    ''
                                                }
                                                onChange={(event) =>
                                                    setRequestForm((prev) => ({
                                                        ...prev,
                                                        concepts: {
                                                            ...prev.concepts,
                                                            [service.id]: event.target.value,
                                                        },
                                                    }))
                                                }
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <label>
                            Desde
                            <input
                                type='date'
                                value={requestForm.periodStart}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        periodStart: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Hasta
                            <input
                                type='date'
                                value={requestForm.periodEnd}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        periodEnd: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>
                        <label>
                            IVA %
                            <input
                                type='number'
                                min='0'
                                max='100'
                                step='0.01'
                                value={requestForm.vatPercent}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        vatPercent: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Concepto
                            <input
                                type='text'
                                value={requestForm.concept}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        concept: event.target.value,
                                    }))
                                }
                                placeholder='General si no editas cada servicio'
                            />
                        </label>
                        <label>
                            Correo destino
                            <input
                                type='text'
                                value={requestForm.emails}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        emails: event.target.value,
                                    }))
                                }
                                placeholder='facturacion@cliente.es'
                                required
                            />
                        </label>
                        <label>
                            Correos en copia
                            <input
                                type='text'
                                value={requestForm.ccEmails}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        ccEmails: event.target.value,
                                    }))
                                }
                                placeholder='correo1@..., correo2@...'
                            />
                        </label>
                        <label className='billing-field-wide'>
                            Notas
                            <textarea
                                value={requestForm.notes}
                                onChange={(event) =>
                                    setRequestForm((prev) => ({
                                        ...prev,
                                        notes: event.target.value,
                                    }))
                                }
                                rows='3'
                            />
                        </label>
                    </div>
                    {calculations.length ? (
                        <div className='billing-summary'>
                            <div className='billing-summary-list'>
                                {calculations.map((calculation) => (
                                    <span key={calculation.service.id}>
                                        {calculation.service.name}: {Number(calculation.totalHours).toFixed(2)} h · Base {formatMoney(calculation.subtotal)} · IVA {Number(calculation.vatPercent).toFixed(2)}% · Total {formatMoney(calculation.amount)}
                                    </span>
                                ))}
                            </div>
                            <strong>
                                Total bloque: {calculationTotals.totalHours.toFixed(2)} h · Base{' '}
                                {formatMoney(calculationTotals.subtotal)} · IVA{' '}
                                {formatMoney(calculationTotals.vatAmount)} · Total{' '}
                                {formatMoney(calculationTotals.amount)}
                            </strong>
                        </div>
                    ) : null}
                    <div className='billing-actions'>
                        <button type='button' onClick={handleCalculate}>
                            Calcular
                        </button>
                        <button type='submit' disabled={saving}>
                            {saving ? 'Enviando...' : 'Pedir facturas'}
                        </button>
                    </div>
                </form>

                <div className='billing-card'>
                    <h3>Filtros</h3>
                    <div className='billing-grid'>
                        <label>
                            Servicio
                            <select
                                value={filters.serviceId}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        serviceId: event.target.value,
                                    }))
                                }
                            >
                                <option value=''>Todos</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Estado
                            <select
                                value={filters.status}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        status: event.target.value,
                                    }))
                                }
                            >
                                <option value=''>Todos</option>
                                {Object.entries(statusLabels).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Desde
                            <input
                                type='date'
                                value={filters.fromDate}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        fromDate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Hasta
                            <input
                                type='date'
                                value={filters.toDate}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        toDate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div className='billing-card'>
                <h3>Registro de facturacion</h3>
                {loading ? <p className='billing-muted'>Cargando...</p> : null}
                <div className='billing-list'>
                    {groupedRecords.length ? (
                        groupedRecords.map((group) => (
                            <section key={group.month} className='billing-month-group'>
                                <h4>{formatMonth(group.month)}</h4>
                                {group.records.map((record) => {
                                    const form = sendForms[record.id] || {};
                                    return (
                                        <article key={record.id} className='billing-item'>
                                            <div className='billing-item-main'>
                                                <div>
                                                    <h4>{record.serviceName}</h4>
                                                    {record.invoiceNumber ? (
                                                        <p>Factura: {record.invoiceNumber}</p>
                                                    ) : null}
                                                    {record.invoiceFilePath ? (
                                                        <div className='billing-file-actions'>
                                                            <a
                                                                href={buildInvoiceFileUrl(
                                                                    record.invoiceFilePath
                                                                )}
                                                                target='_blank'
                                                                rel='noreferrer'
                                                            >
                                                                Ver factura
                                                            </a>
                                                            <a
                                                                href={buildInvoiceFileUrl(
                                                                    record.invoiceFilePath
                                                                )}
                                                                download={
                                                                    record.invoiceFileName ||
                                                                    `factura-${record.invoiceNumber || record.id}.pdf`
                                                                }
                                                            >
                                                                Descargar factura
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                    <p>{record.concept || record.serviceName}</p>
                                                    <p>
                                                        {formatDate(record.periodStart)} -{' '}
                                                        {formatDate(record.periodEnd)}
                                                    </p>
                                                    <p>
                                                        {Number(record.totalHours).toFixed(2)} h ·{' '}
                                                        {formatMoney(record.hourlyRate)} / h · Base{' '}
                                                        {formatMoney(record.subtotal)} · IVA{' '}
                                                        {Number(record.vatPercent || 0).toFixed(2)}% · Total{' '}
                                                        {formatMoney(record.amount)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`billing-status billing-status--${record.status}`}
                                                >
                                                    {statusLabels[record.status] || record.status}
                                                </span>
                                            </div>
                                            {user?.role === 'sudo' ? (
                                                <div className='billing-record-admin-actions'>
                                                    <button
                                                        type='button'
                                                        onClick={() => handleDeleteRecord(record)}
                                                        disabled={saving}
                                                    >
                                                        Borrar registro
                                                    </button>
                                                </div>
                                            ) : null}
                                            <div className='billing-send-grid'>
                                                <label>
                                                    Serie factura
                                                    <input
                                                        type='text'
                                                        value={
                                                            form.invoiceSeries ??
                                                            record.invoiceSeries ??
                                                            '1'
                                                        }
                                                        onChange={(event) =>
                                                            setSendForms((prev) => ({
                                                                ...prev,
                                                                [record.id]: {
                                                                    ...prev[record.id],
                                                                    invoiceSeries:
                                                                        event.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </label>
                                                <button
                                                    type='button'
                                                    onClick={() => handleGenerateInvoice(record)}
                                                    disabled={saving}
                                                >
                                                    {record.invoiceNumber
                                                        ? `Regenerar ${record.invoiceNumber}`
                                                        : 'Generar PDF'}
                                                </button>
                                                <label>
                                                    Email cliente
                                                    <input
                                                        type='text'
                                                        value={
                                                            form.emails ??
                                                            record.clientEmails ??
                                                            record.clientEmail ??
                                                            ''
                                                        }
                                                        onChange={(event) =>
                                                            setSendForms((prev) => ({
                                                                ...prev,
                                                                [record.id]: {
                                                                    ...prev[record.id],
                                                                    emails: event.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    Copia
                                                    <input
                                                        type='text'
                                                        value={
                                                            form.ccEmails ??
                                                            record.clientCcEmails ??
                                                            ''
                                                        }
                                                        onChange={(event) =>
                                                            setSendForms((prev) => ({
                                                                ...prev,
                                                                [record.id]: {
                                                                    ...prev[record.id],
                                                                    ccEmails: event.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    Factura PDF
                                                    <input
                                                        type='file'
                                                        accept='application/pdf,.pdf'
                                                        onChange={(event) =>
                                                            setSendForms((prev) => ({
                                                                ...prev,
                                                                [record.id]: {
                                                                    ...prev[record.id],
                                                                    invoiceFile:
                                                                        event.target.files?.[0] ||
                                                                        null,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </label>
                                                <label className='billing-field-wide'>
                                                    Mensaje
                                                    <input
                                                        type='text'
                                                        value={form.message || ''}
                                                        onChange={(event) =>
                                                            setSendForms((prev) => ({
                                                                ...prev,
                                                                [record.id]: {
                                                                    ...prev[record.id],
                                                                    message: event.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                </label>
                                                <button
                                                    type='button'
                                                    onClick={() => handleSendInvoice(record)}
                                                    disabled={saving}
                                                >
                                                    Enviar factura al cliente
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>
                        ))
                    ) : (
                        <p className='billing-muted'>Sin registros de facturacion.</p>
                    )}
                </div>
            </div>
        </section>
    );
};

export default BillingComponent;
