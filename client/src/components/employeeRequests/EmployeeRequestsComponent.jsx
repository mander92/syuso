import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    approveEmployeeRequest,
    createEmployeeRequest,
    fetchAdminEmployeeRequests,
    fetchMyEmployeeRequests,
    rejectEmployeeRequest,
} from '../../services/employeeRequestService.js';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';
import './EmployeeRequestsComponent.css';

const requestTypeLabels = {
    vacation: 'Vacaciones',
    days_off: 'Dias libres',
    weekend_rest: 'Fin de semana de descanso',
    availability: 'Disponibilidad eventual',
    other: 'Otra peticion',
};

const statusLabels = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
};

const today = () => new Date().toISOString().slice(0, 10);

const normalizeList = (data) => (Array.isArray(data) ? data : data?.data || []);
const pageSizeOptions = [10, 20, 50];

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const getDateKey = (value) => (value ? String(value).slice(0, 10) : '');

const EmployeeRequestsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const userRole = String(user?.role || '').trim().toLowerCase();
    const isAdminLike = userRole === 'admin' || userRole === 'sudo';
    const isEmployeeLike = userRole === 'employee' || userRole === 'empleado';
    const canCreate = isEmployeeLike || (!isAdminLike && userRole !== 'client');

    const [myRequests, setMyRequests] = useState([]);
    const [adminRequests, setAdminRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actioningId, setActioningId] = useState('');
    const [decisionNotes, setDecisionNotes] = useState({});
    const [filters, setFilters] = useState({
        employeeId: '',
        requestType: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [form, setForm] = useState({
        requestType: 'vacation',
        startDate: today(),
        endDate: today(),
        notes: '',
    });

    const visibleRequests = useMemo(
        () => (isAdminLike ? adminRequests : myRequests),
        [adminRequests, isAdminLike, myRequests]
    );

    const employeeLabel = (request) =>
        String(request.employeeName || '').trim() ||
        request.employeeEmail ||
        'Empleado';

    const employeeOptions = useMemo(() => {
        const map = new Map();
        visibleRequests.forEach((request) => {
            if (!request.employeeId) return;
            if (map.has(request.employeeId)) return;
            map.set(request.employeeId, employeeLabel(request));
        });
        return [...map.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''), 'es', {
                    sensitivity: 'base',
                })
            );
    }, [visibleRequests]);

    const filteredRequests = useMemo(() => {
        const query = normalizeText(filters.search);
        return visibleRequests.filter((request) => {
            if (filters.employeeId && request.employeeId !== filters.employeeId) {
                return false;
            }
            if (
                filters.requestType &&
                request.requestType !== filters.requestType
            ) {
                return false;
            }
            if (filters.status && request.status !== filters.status) {
                return false;
            }

            const startDate = getDateKey(request.startDate);
            const endDate = getDateKey(request.endDate) || startDate;
            if (filters.dateFrom && endDate < filters.dateFrom) return false;
            if (filters.dateTo && startDate > filters.dateTo) return false;

            if (!query) return true;
            return normalizeText(
                [
                    employeeLabel(request),
                    request.employeeEmail,
                    requestTypeLabels[request.requestType],
                    request.requestType,
                    request.notes,
                    request.decisionNotes,
                ].join(' ')
            ).includes(query);
        });
    }, [filters, visibleRequests]);

    const pendingCount = filteredRequests.filter(
        (request) => request.status === 'pending'
    ).length;
    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginatedRequests = filteredRequests.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize
    );
    const firstVisible = filteredRequests.length
        ? (safePage - 1) * pageSize + 1
        : 0;
    const lastVisible = Math.min(safePage * pageSize, filteredRequests.length);

    useEffect(() => {
        setPage(1);
    }, [filters, pageSize]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const loadRequests = useCallback(async () => {
        if (!authToken || !user) return;
        try {
            setLoading(true);
            if (isAdminLike) {
                const data = await fetchAdminEmployeeRequests(authToken);
                setAdminRequests(normalizeList(data));
            }
            if (!isAdminLike) {
                const data = await fetchMyEmployeeRequests(authToken);
                setMyRequests(normalizeList(data));
            }
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar las peticiones');
        } finally {
            setLoading(false);
        }
    }, [authToken, isAdminLike, user]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canCreate) return;

        try {
            setSaving(true);
            const created = await createEmployeeRequest(authToken, form);
            setMyRequests((prev) => [created, ...prev]);
            setForm((prev) => ({
                ...prev,
                requestType: 'vacation',
                notes: '',
            }));
            toast.success('Peticion enviada');
        } catch (error) {
            toast.error(error.message || 'No se pudo enviar la peticion');
        } finally {
            setSaving(false);
        }
    };

    const handleDecision = async (requestId, action) => {
        try {
            setActioningId(requestId);
            const notes = decisionNotes[requestId] || '';
            const updated =
                action === 'approve'
                    ? await approveEmployeeRequest(authToken, requestId, notes)
                    : await rejectEmployeeRequest(authToken, requestId, notes);
            setAdminRequests((prev) =>
                prev.map((request) =>
                    request.id === requestId ? { ...request, ...updated } : request
                )
            );
            toast.success(action === 'approve' ? 'Peticion aprobada' : 'Peticion rechazada');
        } catch (error) {
            toast.error(error.message || 'No se pudo resolver la peticion');
        } finally {
            setActioningId('');
        }
    };

    const formatDate = (value) =>
        value
            ? new Intl.DateTimeFormat('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
              }).format(new Date(value))
            : '-';

    const updateFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            employeeId: '',
            requestType: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            search: '',
        });
    };

    if (!isAdminLike && !canCreate) {
        return (
            <section className='employee-requests'>
                <p className='employee-requests-empty'>
                    Esta seccion esta disponible para empleados y administradores.
                </p>
            </section>
        );
    }

    return (
        <section className='employee-requests'>
            <div className='employee-requests__header'>
                <div>
                    <p className='employee-requests__eyebrow'>Peticiones</p>
                    <h2>{isAdminLike ? 'Solicitudes del equipo' : 'Mis peticiones'}</h2>
                </div>
                <div className='employee-requests-header__meta'>
                    <span className='employee-requests-counter'>
                        {pendingCount} pendientes
                    </span>
                    <span className='employee-requests-counter employee-requests-counter--muted'>
                        {filteredRequests.length} filtradas
                    </span>
                </div>
            </div>

            {canCreate ? (
                <form className='employee-requests-form' onSubmit={handleSubmit}>
                    <label>
                        Tipo
                        <select
                            value={form.requestType}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    requestType: event.target.value,
                                }))
                            }
                        >
                            <option value='vacation'>Vacaciones</option>
                            <option value='days_off'>Dias libres</option>
                            <option value='weekend_rest'>Fin de semana de descanso</option>
                            <option value='availability'>Disponibilidad eventual</option>
                            <option value='other'>Otra peticion</option>
                        </select>
                    </label>
                    <label>
                        Inicio
                        <input
                            type='date'
                            value={form.startDate}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    startDate: event.target.value,
                                }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Fin
                        <input
                            type='date'
                            value={form.endDate}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    endDate: event.target.value,
                                }))
                            }
                            required
                        />
                    </label>
                    <label className='employee-requests-form__notes'>
                        Comentario
                        <textarea
                            value={form.notes}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    notes: event.target.value,
                                }))
                            }
                            maxLength={500}
                            rows={3}
                        />
                    </label>
                    <button type='submit' disabled={saving}>
                        {saving ? 'Enviando...' : 'Enviar peticion'}
                    </button>
                </form>
            ) : null}

            <div className='employee-requests-filters'>
                {isAdminLike ? (
                    <label>
                        Empleado
                        <select
                            value={filters.employeeId}
                            onChange={(event) =>
                                updateFilter('employeeId', event.target.value)
                            }
                        >
                            <option value=''>Todos</option>
                            {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
                <label>
                    Tipo
                    <select
                        value={filters.requestType}
                        onChange={(event) =>
                            updateFilter('requestType', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {Object.entries(requestTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Estado
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            updateFilter('status', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Desde
                    <input
                        type='date'
                        value={filters.dateFrom}
                        onChange={(event) =>
                            updateFilter('dateFrom', event.target.value)
                        }
                    />
                </label>
                <label>
                    Hasta
                    <input
                        type='date'
                        value={filters.dateTo}
                        onChange={(event) =>
                            updateFilter('dateTo', event.target.value)
                        }
                    />
                </label>
                <label className='employee-requests-filters__search'>
                    Buscar
                    <input
                        type='search'
                        value={filters.search}
                        onChange={(event) =>
                            updateFilter('search', event.target.value)
                        }
                        placeholder='Nombre, nota...'
                    />
                </label>
                <button
                    type='button'
                    className='employee-requests-filter-clear'
                    onClick={clearFilters}
                >
                    Limpiar filtros
                </button>
            </div>

            <div className='employee-requests-list-wrap'>
                {loading ? (
                    <p className='employee-requests-empty'>Cargando...</p>
                ) : !filteredRequests.length ? (
                    <p className='employee-requests-empty'>
                        No hay peticiones registradas.
                    </p>
                ) : (
                    <>
                        <ul className='employee-requests-list'>
                            {paginatedRequests.map((request) => (
                                <li className='employee-requests-item' key={request.id}>
                                    <div className='employee-requests-item__head'>
                                        <div>
                                            <p className='employee-requests-type'>
                                                {requestTypeLabels[
                                                    request.requestType
                                                ] || request.requestType}
                                            </p>
                                            {isAdminLike ? (
                                                <p className='employee-requests-meta'>
                                                    {employeeLabel(request)}
                                                </p>
                                            ) : null}
                                            <p className='employee-requests-date'>
                                                {formatDate(request.startDate)} -{' '}
                                                {formatDate(request.endDate)}
                                            </p>
                                        </div>
                                        <span
                                            className={`employee-requests-status employee-requests-status--${request.status}`}
                                        >
                                            {statusLabels[request.status] ||
                                                request.status}
                                        </span>
                                    </div>
                                    {request.notes ? (
                                        <p className='employee-requests-notes'>
                                            {request.notes}
                                        </p>
                                    ) : null}
                                    <p className='employee-requests-created'>
                                        Creada el{' '}
                                        {formatDateTimeMadrid(request.createdAt)}
                                    </p>
                                    {request.decisionNotes ? (
                                        <p className='employee-requests-resolution'>
                                            Resolucion: {request.decisionNotes}
                                        </p>
                                    ) : null}
                                    {isAdminLike && request.status === 'pending' ? (
                                        <div className='employee-requests-admin'>
                                            <input
                                                type='text'
                                                placeholder='Nota de resolucion (opcional)'
                                                value={
                                                    decisionNotes[request.id] || ''
                                                }
                                                onChange={(event) =>
                                                    setDecisionNotes((prev) => ({
                                                        ...prev,
                                                        [request.id]:
                                                            event.target.value,
                                                    }))
                                                }
                                            />
                                            <div className='employee-requests-admin__actions'>
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        handleDecision(
                                                            request.id,
                                                            'reject'
                                                        )
                                                    }
                                                    disabled={
                                                        actioningId === request.id
                                                    }
                                                >
                                                    Rechazar
                                                </button>
                                                <button
                                                    type='button'
                                                    className='employee-requests-btn--primary'
                                                    onClick={() =>
                                                        handleDecision(
                                                            request.id,
                                                            'approve'
                                                        )
                                                    }
                                                    disabled={
                                                        actioningId === request.id
                                                    }
                                                >
                                                    Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                        <div className='employee-requests-pagination'>
                            <span>
                                Mostrando {firstVisible}-{lastVisible} de{' '}
                                {filteredRequests.length}
                            </span>
                            <label>
                                Por pagina
                                <select
                                    value={pageSize}
                                    onChange={(event) =>
                                        setPageSize(Number(event.target.value))
                                    }
                                >
                                    {pageSizeOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className='employee-requests-pagination__actions'>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.max(1, current - 1)
                                        )
                                    }
                                    disabled={safePage <= 1}
                                >
                                    Anterior
                                </button>
                                <strong>
                                    {safePage} / {totalPages}
                                </strong>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(totalPages, current + 1)
                                        )
                                    }
                                    disabled={safePage >= totalPages}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default EmployeeRequestsComponent;
