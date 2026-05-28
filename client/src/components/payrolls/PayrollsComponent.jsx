import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    deletePayroll,
    fetchPayrolls,
    importPayrolls,
    openPayrollFile,
    updatePayroll,
} from '../../services/payrollService.js';
import './PayrollsComponent.css';

const statusLabels = {
    unmatched: 'Sin emparejar',
    matched: 'Emparejada',
    published: 'Publicada',
    rejected: 'Rechazada',
};

const getEmployeeName = (item) =>
    `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
    item.detectedName ||
    'Sin trabajador';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const formatMonthLabel = (value) => {
    if (!value) return 'Sin mes';
    const [year, month] = String(value).split('-');
    if (!year || !month) return value;
    return new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(Number(year), Number(month) - 1, 1));
};

const buildPayrollMonthRows = (items, sortByEmployee = false) => {
    const groups = new Map();
    items.forEach((payroll) => {
        const key = payroll.payrollMonth || 'sin-mes';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(payroll);
    });

    return [...groups.entries()]
        .sort(([a], [b]) => {
            if (a === 'sin-mes') return 1;
            if (b === 'sin-mes') return -1;
            return String(b).localeCompare(String(a));
        })
        .flatMap(([month, monthItems]) => {
            const sortedItems = monthItems.slice().sort((a, b) => {
                if (sortByEmployee) {
                    return getEmployeeName(a).localeCompare(
                        getEmployeeName(b),
                        'es',
                        { sensitivity: 'base' }
                    );
                }
                return String(b.createdAt || '').localeCompare(
                    String(a.createdAt || '')
                );
            });

            return [
                {
                    id: `month-${month}`,
                    isMonthHeader: true,
                    month,
                    label:
                        month === 'sin-mes' ? 'Sin mes' : formatMonthLabel(month),
                    count: sortedItems.length,
                },
                ...sortedItems.map((item) => ({
                    ...item,
                    monthKey: month,
                })),
            ];
        });
};

const PayrollsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';
    const [payrolls, setPayrolls] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filters, setFilters] = useState({
        employeeId: '',
        month: '',
        status: '',
    });
    const [importForm, setImportForm] = useState({
        uploadMode: 'multiple',
        defaultMonth: getCurrentMonth(),
        publishMatched: false,
    });
    const [files, setFiles] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState({});
    const [expandedMatchGroups, setExpandedMatchGroups] = useState({
        matched: true,
        unmatched: true,
    });
    const [selectedPayrollIds, setSelectedPayrollIds] = useState([]);

    const employeeOptions = useMemo(
        () =>
            employees
                .slice()
                .sort((a, b) =>
                    getEmployeeName(a).localeCompare(getEmployeeName(b), 'es', {
                        sensitivity: 'base',
                    })
                ),
        [employees]
    );

    const loadPayrolls = async () => {
        setLoading(true);
        try {
            const data = await fetchPayrolls(authToken, filters);
            setPayrolls(data.payrolls || []);
            setEmployees(data.employees || []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar las nominas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authToken) return;
        loadPayrolls();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, filters.employeeId, filters.month, filters.status]);

    const handleImport = async (event) => {
        event.preventDefault();
        if (!files?.length) {
            toast.error('Sube al menos un PDF');
            return;
        }

        setSaving(true);
        try {
            const data = await importPayrolls({
                authToken,
                files,
                ...importForm,
            });
            toast.success(
                `${data.totalFiles} nominas importadas: ${data.matchedCount} emparejadas`
            );
            setFiles(null);
            await loadPayrolls();
        } catch (error) {
            toast.error(error.message || 'No se pudieron importar las nominas');
        } finally {
            setSaving(false);
        }
    };

    const handlePayrollChange = async (payrollId, payload) => {
        setSaving(true);
        try {
            await updatePayroll(authToken, payrollId, payload);
            await loadPayrolls();
            toast.success('Nomina actualizada');
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar la nomina');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (payrollId) => {
        if (!window.confirm('Se borrara esta nomina. Continuar?')) return;
        setSaving(true);
        try {
            await deletePayroll(authToken, payrollId);
            await loadPayrolls();
            toast.success('Nomina borrada');
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar la nomina');
        } finally {
            setSaving(false);
        }
    };

    const togglePayrollSelection = (payrollId) => {
        setSelectedPayrollIds((prev) =>
            prev.includes(payrollId)
                ? prev.filter((id) => id !== payrollId)
                : [...prev, payrollId]
        );
    };

    const selectedPayrolls = useMemo(
        () =>
            payrolls.filter((payroll) =>
                selectedPayrollIds.includes(payroll.id)
            ),
        [payrolls, selectedPayrollIds]
    );

    const publishablePayrolls = useMemo(
        () =>
            payrolls.filter(
                (payroll) =>
                    payroll.employeeId &&
                    payroll.payrollMonth &&
                    payroll.status !== 'published'
            ),
        [payrolls]
    );

    useEffect(() => {
        setSelectedPayrollIds((prev) =>
            prev.filter((id) => payrolls.some((payroll) => payroll.id === id))
        );
    }, [payrolls]);

    const publishPayrollBatch = async (items, successMessage) => {
        if (!items.length) {
            toast.error('No hay nominas para publicar');
            return;
        }

        const invalid = items.filter(
            (payroll) => !payroll.employeeId || !payroll.payrollMonth
        );
        if (invalid.length) {
            toast.error('Solo se pueden publicar nominas emparejadas y con mes');
            return;
        }

        if (!window.confirm(`Se publicaran ${items.length} nominas. Continuar?`)) {
            return;
        }

        setSaving(true);
        try {
            await Promise.all(
                items.map((payroll) =>
                    updatePayroll(authToken, payroll.id, {
                        status: 'published',
                    })
                )
            );
            setSelectedPayrollIds([]);
            await loadPayrolls();
            toast.success(successMessage);
        } catch (error) {
            toast.error(error.message || 'No se pudieron publicar las nominas');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedPayrolls.length) {
            toast.error('Selecciona alguna nomina');
            return;
        }

        if (
            !window.confirm(
                `Se borraran ${selectedPayrolls.length} nominas seleccionadas. Continuar?`
            )
        ) {
            return;
        }

        setSaving(true);
        try {
            await Promise.all(
                selectedPayrolls.map((payroll) =>
                    deletePayroll(authToken, payroll.id)
                )
            );
            setSelectedPayrollIds([]);
            await loadPayrolls();
            toast.success('Nominas seleccionadas borradas');
        } catch (error) {
            toast.error(error.message || 'No se pudieron borrar las nominas');
        } finally {
            setSaving(false);
        }
    };

    const groupedPayrolls = useMemo(
        () => buildPayrollMonthRows(payrolls, isAdminLike),
        [isAdminLike, payrolls]
    );

    const payrollMatchGroups = useMemo(() => {
        const matched = payrolls.filter((payroll) => payroll.employeeId);
        const unmatched = payrolls.filter((payroll) => !payroll.employeeId);

        return [
            {
                key: 'matched',
                label: 'Emparejadas',
                count: matched.length,
                rows: buildPayrollMonthRows(matched, true),
            },
            {
                key: 'unmatched',
                label: 'No emparejadas',
                count: unmatched.length,
                rows: buildPayrollMonthRows(unmatched, true),
            },
        ];
    }, [payrolls]);

    useEffect(() => {
        if (!groupedPayrolls.length) {
            setExpandedMonths({});
            return;
        }

        setExpandedMonths((prev) => {
            const next = {};
            groupedPayrolls
                .filter((item) => item.isMonthHeader)
                .forEach((group) => {
                    next[group.month] = prev[group.month] ?? true;
            });
            payrollMatchGroups.forEach((matchGroup) => {
                matchGroup.rows
                    .filter((item) => item.isMonthHeader)
                    .forEach((group) => {
                        next[`${matchGroup.key}-${group.month}`] =
                            prev[`${matchGroup.key}-${group.month}`] ?? true;
                    });
            });
            return next;
        });
    }, [groupedPayrolls, payrollMatchGroups]);

    const toggleMonth = (month) => {
        setExpandedMonths((prev) => ({
            ...prev,
            [month]: !prev[month],
        }));
    };

    const toggleMatchGroup = (groupKey) => {
        setExpandedMatchGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    const renderPayrollItem = (payroll) => (
        <article key={payroll.id} className='payrolls-item'>
            {isAdminLike ? (
                <label className='payrolls-select'>
                    <input
                        type='checkbox'
                        checked={selectedPayrollIds.includes(payroll.id)}
                        onChange={() => togglePayrollSelection(payroll.id)}
                    />
                    Seleccionar
                </label>
            ) : null}
            <div className='payrolls-item-main'>
                <div>
                    <h4>{getEmployeeName(payroll)}</h4>
                    <p>
                        {payroll.payrollMonth || 'Sin mes'} ·{' '}
                        {payroll.originalFileName}
                    </p>
                    {payroll.detectedDni ? (
                        <p>DNI detectado: {payroll.detectedDni}</p>
                    ) : null}
                </div>
                <span
                    className={`payrolls-status payrolls-status--${payroll.status}`}
                >
                    {statusLabels[payroll.status] || payroll.status}
                </span>
            </div>

            {isAdminLike ? (
                <div className='payrolls-edit-grid'>
                    <div className='payrolls-field'>
                        <label>Empleado</label>
                        <select
                            value={payroll.employeeId || ''}
                            onChange={(event) =>
                                handlePayrollChange(payroll.id, {
                                    employeeId: event.target.value,
                                })
                            }
                            disabled={saving}
                        >
                            <option value=''>Sin emparejar</option>
                            {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {getEmployeeName(employee)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='payrolls-field'>
                        <label>Mes</label>
                        <input
                            type='month'
                            value={payroll.payrollMonth || ''}
                            onChange={(event) =>
                                handlePayrollChange(payroll.id, {
                                    payrollMonth: event.target.value,
                                })
                            }
                            disabled={saving}
                        />
                    </div>
                    <div className='payrolls-field'>
                        <label>Estado</label>
                        <select
                            value={payroll.status}
                            onChange={(event) =>
                                handlePayrollChange(payroll.id, {
                                    status: event.target.value,
                                })
                            }
                            disabled={saving}
                        >
                            <option value='unmatched'>Sin emparejar</option>
                            <option value='matched'>Emparejada</option>
                            <option value='published'>Publicada</option>
                            <option value='rejected'>Rechazada</option>
                        </select>
                    </div>
                </div>
            ) : null}

            <div className='payrolls-actions'>
                <button
                    type='button'
                    className='payrolls-btn payrolls-btn--ghost'
                    onClick={() =>
                        openPayrollFile(authToken, payroll.id).catch((error) =>
                            toast.error(error.message)
                        )
                    }
                >
                    Ver PDF
                </button>
                {isAdminLike ? (
                    <button
                        type='button'
                        className='payrolls-btn payrolls-btn--danger'
                        onClick={() => handleDelete(payroll.id)}
                        disabled={saving}
                    >
                        Borrar
                    </button>
                ) : null}
            </div>
        </article>
    );

    return (
        <section className='payrolls'>
            <header className='payrolls-header'>
                <p>{isAdminLike ? 'Nominas' : 'Mis nominas'}</p>
                <h2>{isAdminLike ? 'Gestion de nominas' : 'Mis nominas'}</h2>
                <span>
                    {isAdminLike
                        ? 'Importa PDFs, revisa emparejamientos y publica nominas.'
                        : 'Consulta tus nominas publicadas por mes.'}
                </span>
            </header>

            {isAdminLike ? (
                <div className='payrolls-layout'>
                    <form className='payrolls-card' onSubmit={handleImport}>
                        <h3>Importar nominas</h3>
                        <div className='payrolls-import-grid'>
                            <div className='payrolls-field'>
                                <label>Modo</label>
                                <select
                                    value={importForm.uploadMode}
                                    onChange={(event) =>
                                        setImportForm((prev) => ({
                                            ...prev,
                                            uploadMode: event.target.value,
                                        }))
                                    }
                                >
                                    <option value='multiple'>
                                        Varios PDFs
                                    </option>
                                    <option value='onePerPage'>
                                        PDF multipagina: una nomina por pagina
                                    </option>
                                </select>
                            </div>
                            <div className='payrolls-field'>
                                <label>Mes de las nominas</label>
                                <input
                                    type='month'
                                    value={importForm.defaultMonth}
                                    onChange={(event) =>
                                        setImportForm((prev) => ({
                                            ...prev,
                                            defaultMonth: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className='payrolls-field'>
                                <label>Publicacion</label>
                                <select
                                    value={importForm.publishMatched ? 'yes' : 'no'}
                                    onChange={(event) =>
                                        setImportForm((prev) => ({
                                            ...prev,
                                            publishMatched:
                                                event.target.value === 'yes',
                                        }))
                                    }
                                >
                                    <option value='no'>
                                        Revisar antes de publicar
                                    </option>
                                    <option value='yes'>
                                        Publicar emparejadas
                                    </option>
                                </select>
                            </div>
                            <div className='payrolls-field payrolls-field--wide'>
                                <label>Archivos PDF</label>
                                <input
                                    type='file'
                                    accept='application/pdf,.pdf'
                                    multiple
                                    onChange={(event) =>
                                        setFiles(event.target.files)
                                    }
                                />
                            </div>
                        </div>
                        <div className='payrolls-actions'>
                            <button
                                type='submit'
                                className='payrolls-btn'
                                disabled={saving}
                            >
                                {saving ? 'Importando...' : 'Importar'}
                            </button>
                        </div>
                    </form>

                    <div className='payrolls-card'>
                        <h3>Filtros</h3>
                        <div className='payrolls-filters'>
                            <div className='payrolls-field'>
                                <label>Empleado</label>
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
                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {getEmployeeName(employee)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='payrolls-field'>
                                <label>Mes</label>
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
                            </div>
                            <div className='payrolls-field'>
                                <label>Estado</label>
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
                                    <option value='unmatched'>
                                        Sin emparejar
                                    </option>
                                    <option value='matched'>Emparejadas</option>
                                    <option value='published'>Publicadas</option>
                                    <option value='rejected'>Rechazadas</option>
                                </select>
                            </div>
                            <div className='payrolls-actions'>
                                <button
                                    type='button'
                                    className='payrolls-btn payrolls-btn--ghost'
                                    onClick={() =>
                                        setFilters({
                                            employeeId: '',
                                            month: '',
                                            status: '',
                                        })
                                    }
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className='payrolls-card'>
                <div className='payrolls-card-heading'>
                    <div>
                        <h3>
                            {isAdminLike
                                ? 'Nominas importadas'
                                : 'Nominas disponibles'}
                        </h3>
                        {isAdminLike ? (
                            <p className='payrolls-muted'>
                                {selectedPayrolls.length} seleccionadas
                            </p>
                        ) : null}
                    </div>
                    {isAdminLike ? (
                        <div className='payrolls-quick-actions'>
                            <button
                                type='button'
                                className='payrolls-btn'
                                onClick={() =>
                                    publishPayrollBatch(
                                        publishablePayrolls,
                                        'Nominas emparejadas publicadas'
                                    )
                                }
                                disabled={saving || !publishablePayrolls.length}
                            >
                                Publicar emparejadas
                            </button>
                            <button
                                type='button'
                                className='payrolls-btn payrolls-btn--ghost'
                                onClick={() =>
                                    publishPayrollBatch(
                                        selectedPayrolls,
                                        'Nominas seleccionadas publicadas'
                                    )
                                }
                                disabled={saving || !selectedPayrolls.length}
                            >
                                Publicar seleccionadas
                            </button>
                            <button
                                type='button'
                                className='payrolls-btn payrolls-btn--danger'
                                onClick={handleDeleteSelected}
                                disabled={saving || !selectedPayrolls.length}
                            >
                                Borrar seleccionadas
                            </button>
                        </div>
                    ) : null}
                </div>
                {loading ? <p className='payrolls-muted'>Cargando...</p> : null}
                <div className='payrolls-list'>
                    {isAdminLike
                        ? payrollMatchGroups.map((group) => (
                              <div
                                  key={group.key}
                                  className='payrolls-match-group'
                              >
                                  <button
                                      type='button'
                                      className='payrolls-match-toggle'
                                      onClick={() => toggleMatchGroup(group.key)}
                                  >
                                      <span>{group.label}</span>
                                      <small>{group.count} nominas</small>
                                      <strong>
                                          {expandedMatchGroups[group.key]
                                              ? '-'
                                              : '+'}
                                      </strong>
                                  </button>
                                  {expandedMatchGroups[group.key]
                                      ? group.rows.map((payroll) =>
                                            payroll.isMonthHeader ? (
                                                <button
                                                    key={`${group.key}-${payroll.id}`}
                                                    type='button'
                                                    className='payrolls-month-toggle'
                                                    onClick={() =>
                                                        toggleMonth(
                                                            `${group.key}-${payroll.month}`
                                                        )
                                                    }
                                                >
                                                    <span>{payroll.label}</span>
                                                    <small>
                                                        {payroll.count} nominas
                                                    </small>
                                                    <strong>
                                                        {expandedMonths[
                                                            `${group.key}-${payroll.month}`
                                                        ]
                                                            ? '-'
                                                            : '+'}
                                                    </strong>
                                                </button>
                                            ) : expandedMonths[
                                                  `${group.key}-${payroll.monthKey}`
                                              ] ? (
                                                renderPayrollItem(payroll)
                                            ) : null
                                        )
                                      : null}
                              </div>
                          ))
                        : null}
                    {!isAdminLike && groupedPayrolls.map((payroll) =>
                        payroll.isMonthHeader ? (
                            <button
                                key={payroll.id}
                                type='button'
                                className='payrolls-month-toggle'
                                onClick={() => toggleMonth(payroll.month)}
                            >
                                <span>{payroll.label}</span>
                                <small>{payroll.count} nominas</small>
                                <strong>
                                    {expandedMonths[payroll.month] ? '-' : '+'}
                                </strong>
                            </button>
                        ) : expandedMonths[payroll.monthKey] ? (
                        <article key={payroll.id} className='payrolls-item'>
                            <div className='payrolls-item-main'>
                                <div>
                                    <h4>{getEmployeeName(payroll)}</h4>
                                    <p>
                                        {payroll.payrollMonth || 'Sin mes'} ·{' '}
                                        {payroll.originalFileName}
                                    </p>
                                    {payroll.detectedDni ? (
                                        <p>DNI detectado: {payroll.detectedDni}</p>
                                    ) : null}
                                </div>
                                <span
                                    className={`payrolls-status payrolls-status--${payroll.status}`}
                                >
                                    {statusLabels[payroll.status] ||
                                        payroll.status}
                                </span>
                            </div>

                            {isAdminLike ? (
                                <div className='payrolls-edit-grid'>
                                    <div className='payrolls-field'>
                                        <label>Empleado</label>
                                        <select
                                            value={payroll.employeeId || ''}
                                            onChange={(event) =>
                                                handlePayrollChange(payroll.id, {
                                                    employeeId:
                                                        event.target.value,
                                                })
                                            }
                                            disabled={saving}
                                        >
                                            <option value=''>
                                                Sin emparejar
                                            </option>
                                            {employeeOptions.map((employee) => (
                                                <option
                                                    key={employee.id}
                                                    value={employee.id}
                                                >
                                                    {getEmployeeName(employee)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className='payrolls-field'>
                                        <label>Mes</label>
                                        <input
                                            type='month'
                                            value={payroll.payrollMonth || ''}
                                            onChange={(event) =>
                                                handlePayrollChange(payroll.id, {
                                                    payrollMonth:
                                                        event.target.value,
                                                })
                                            }
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className='payrolls-field'>
                                        <label>Estado</label>
                                        <select
                                            value={payroll.status}
                                            onChange={(event) =>
                                                handlePayrollChange(payroll.id, {
                                                    status: event.target.value,
                                                })
                                            }
                                            disabled={saving}
                                        >
                                            <option value='unmatched'>
                                                Sin emparejar
                                            </option>
                                            <option value='matched'>
                                                Emparejada
                                            </option>
                                            <option value='published'>
                                                Publicada
                                            </option>
                                            <option value='rejected'>
                                                Rechazada
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            ) : null}

                            <div className='payrolls-actions'>
                                <button
                                    type='button'
                                    className='payrolls-btn payrolls-btn--ghost'
                                    onClick={() =>
                                        openPayrollFile(authToken, payroll.id).catch(
                                            (error) => toast.error(error.message)
                                        )
                                    }
                                >
                                    Ver PDF
                                </button>
                                {isAdminLike ? (
                                    <button
                                        type='button'
                                        className='payrolls-btn payrolls-btn--danger'
                                        onClick={() => handleDelete(payroll.id)}
                                        disabled={saving}
                                    >
                                        Borrar
                                    </button>
                                ) : null}
                            </div>
                        </article>
                        ) : null
                    )}
                </div>
                {!loading && !groupedPayrolls.length ? (
                    <p className='payrolls-empty'>
                        {isAdminLike
                            ? 'No hay nominas con estos filtros.'
                            : 'Todavia no tienes nominas publicadas.'}
                    </p>
                ) : null}
            </div>
        </section>
    );
};

export default PayrollsComponent;
