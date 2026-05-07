import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    approveShiftSwapRequest,
    createShiftSwapRequest,
    fetchAdminShiftSwapRequests,
    fetchMyShiftSwapRequests,
    rejectShiftSwapRequest,
} from '../../services/shiftSwapService.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
    fetchEmployeeScheduleShifts,
    fetchServiceScheduleShifts,
} from '../../services/serviceService.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';
import './ShiftSwapsComponent.css';

const statusLabels = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
};

const normalizeServices = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.data)) return data.data.data;
    return [];
};

const ShiftSwapsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';
    const isEmployee = user?.role === 'employee';

    const [myRequests, setMyRequests] = useState([]);
    const [adminRequests, setAdminRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [month, setMonth] = useState(
        () => new Date().toISOString().slice(0, 7)
    );
    const [formServiceId, setFormServiceId] = useState('');
    const [form, setForm] = useState({
        fromShiftId: '',
        toShiftId: '',
        counterpartId: '',
        reason: '',
    });
    const [myShifts, setMyShifts] = useState([]);
    const [serviceShifts, setServiceShifts] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadingAdmin, setLoadingAdmin] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [creating, setCreating] = useState(false);
    const [actioningId, setActioningId] = useState('');
    const [rejectNotes, setRejectNotes] = useState({});

    const serviceNameMap = useMemo(() => {
        const map = new Map();
        services.forEach((svc) => {
            const id = svc.serviceId || svc.id;
            if (!id || map.has(id)) return;
            const name =
                svc.name ||
                svc.type ||
                svc.serviceName ||
                svc.typeOfService ||
                'Servicio';
            map.set(id, name);
        });
        return map;
    }, [services]);

    const employeeNameMap = useMemo(() => {
        const map = new Map();
        employees.forEach((emp) => {
            const label = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
            map.set(emp.id, label || emp.email || 'Empleado');
        });
        return map;
    }, [employees]);

    const shiftMap = useMemo(() => {
        const map = new Map();
        myShifts.forEach((shift) => {
            if (shift?.id) map.set(shift.id, shift);
        });
        serviceShifts.forEach((shift) => {
            if (shift?.id && !map.has(shift.id)) {
                map.set(shift.id, shift);
            }
        });
        return map;
    }, [myShifts, serviceShifts]);

    useEffect(() => {
        if (!authToken || !user) return;

        const loadServices = async () => {
            try {
                if (isAdminLike) {
                    const data = await fetchAllServicesServices('', authToken);
                    setServices(normalizeServices(data));
                    return;
                }

                if (isEmployee) {
                    const data = await fetchEmployeeAllServicesServices(
                        '',
                        authToken
                    );
                    setServices(normalizeServices(data));
                    return;
                }

                setServices([]);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar los servicios disponibles'
                );
            }
        };

        loadServices();
    }, [authToken, user, isAdminLike, isEmployee]);

    useEffect(() => {
        if (!authToken) return;

        const loadMy = async () => {
            try {
                setLoadingRequests(true);
                const data = await fetchMyShiftSwapRequests(authToken);
                setMyRequests(Array.isArray(data) ? data : data?.data || []);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar tus solicitudes de cambio'
                );
            } finally {
                setLoadingRequests(false);
            }
        };

        const loadAdmin = async () => {
            if (!isAdminLike) return;
            try {
                setLoadingAdmin(true);
                const data = await fetchAdminShiftSwapRequests(authToken);
                setAdminRequests(Array.isArray(data) ? data : data?.data || []);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar las solicitudes para aprobar'
                );
            } finally {
                setLoadingAdmin(false);
            }
        };

        loadMy();
        loadAdmin();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        if (!authToken || !isAdminLike) return;

        const loadEmployees = async () => {
            try {
                const params = new URLSearchParams({ role: 'employee' });
                const data = await fetchAllUsersServices(
                    params.toString(),
                    authToken
                );
                const list = Array.isArray(data)
                    ? data
                    : data?.users || data?.data || [];
                setEmployees(list);
            } catch {
                setEmployees([]);
            }
        };

        loadEmployees();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            fromShiftId: '',
            toShiftId: '',
            counterpartId: '',
        }));
        setMyShifts([]);
        setServiceShifts([]);
        if (!authToken || !formServiceId) return;

        const loadShifts = async () => {
            try {
                setLoadingShifts(true);
                const personal = await fetchEmployeeScheduleShifts(
                    authToken,
                    month,
                    false,
                    formServiceId
                );
                setMyShifts(Array.isArray(personal) ? personal : []);

                if (isAdminLike) {
                    const team = await fetchServiceScheduleShifts(
                        authToken,
                        formServiceId,
                        month
                    );
                    setServiceShifts(Array.isArray(team) ? team : []);
                } else {
                    setServiceShifts([]);
                }
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar los turnos del servicio'
                );
            } finally {
                setLoadingShifts(false);
            }
        };

        loadShifts();
    }, [authToken, formServiceId, month, isAdminLike]);

    const formatShift = (shift) => {
        if (!shift) return '';
        const date = shift.scheduleDate || shift.startDateTime || '';
        const start = shift.startTime || shift.startDateTime?.slice(11, 16);
        const end = shift.endTime || shift.endDateTime?.slice(11, 16);
        const type = shift.shiftTypeName || '';
        return `${date} · ${start || '?'}-${end || '?'}${
            type ? ` · ${type}` : ''
        }`;
    };

    const describeShift = (shiftId) => {
        if (!shiftId) return '—';
        const info = shiftMap.get(shiftId);
        if (info) return formatShift(info);
        return `ID ${shiftId.slice(0, 8)}…`;
    };

    const describeUser = (userId) => {
        if (!userId) return '—';
        if (userId === user?.id) return 'Tú';
        return employeeNameMap.get(userId) || `ID ${userId.slice(0, 8)}…`;
    };

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleToShiftChange = (value) => {
        const targetShift = serviceShifts.find((shift) => shift.id === value);
        setForm((prev) => ({
            ...prev,
            toShiftId: value,
            counterpartId: targetShift?.employeeId || prev.counterpartId,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!authToken) return;

        const payload = {
            serviceId: formServiceId,
            fromShiftId: form.fromShiftId,
            toShiftId: form.toShiftId,
            counterpartId: form.counterpartId,
            reason: form.reason.trim() || null,
        };

        const missing = Object.entries({
            serviceId: payload.serviceId,
            fromShiftId: payload.fromShiftId,
            toShiftId: payload.toShiftId,
            counterpartId: payload.counterpartId,
        }).filter(([, value]) => !value);
        if (missing.length) {
            toast.error('Completa servicio, tus turnos y el del compañero.');
            return;
        }

        try {
            setCreating(true);
            await createShiftSwapRequest(authToken, payload);
            toast.success('Solicitud enviada.');
            setForm((prev) => ({
                ...prev,
                fromShiftId: '',
                toShiftId: '',
                counterpartId: '',
                reason: '',
            }));
            const mine = await fetchMyShiftSwapRequests(authToken);
            setMyRequests(Array.isArray(mine) ? mine : mine?.data || []);
        } catch (error) {
            toast.error(error.message || 'No se pudo crear la solicitud');
        } finally {
            setCreating(false);
        }
    };

    const updateRequestLocal = (updated) => {
        setAdminRequests((prev) =>
            prev.map((req) => (req.id === updated.id ? updated : req))
        );
        setMyRequests((prev) =>
            prev.map((req) => (req.id === updated.id ? updated : req))
        );
    };

    const handleApprove = async (requestId) => {
        if (!authToken) return;
        try {
            setActioningId(requestId);
            const data = await approveShiftSwapRequest(authToken, requestId);
            toast.success('Solicitud aprobada.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo aprobar');
        } finally {
            setActioningId('');
        }
    };

    const handleReject = async (requestId) => {
        if (!authToken) return;
        const reason = rejectNotes[requestId] || '';
        try {
            setActioningId(requestId);
            const data = await rejectShiftSwapRequest(
                authToken,
                requestId,
                reason
            );
            toast.success('Solicitud rechazada.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo rechazar');
        } finally {
            setActioningId('');
        }
    };

    if (!user || (!isEmployee && !isAdminLike)) {
        return (
            <section className='shift-swaps'>
                <div className='shift-swaps-card'>
                    <h2>Cambios de turno</h2>
                    <p>
                        Esta funcionalidad está disponible solo para empleados
                        y administradores.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className='shift-swaps'>
            <header className='shift-swaps__header'>
                <div>
                    <p className='shift-swaps__eyebrow'>Operativa interna</p>
                    <h2>Cambios de turno</h2>
                    <p className='shift-swaps__subtitle'>
                        Solicita intercambios entre compañeros y gestiona las
                        aprobaciones desde un único panel.
                    </p>
                </div>
                <div className='shift-swaps__meta'>
                    <span className='shift-swaps__badge'>
                        {myRequests.length} solicitudes
                    </span>
                    {isAdminLike ? (
                        <span className='shift-swaps__badge shift-swaps__badge--accent'>
                            {adminRequests.filter(
                                (req) => req.status === 'pending'
                            ).length || 0}{' '}
                            pendientes
                        </span>
                    ) : null}
                </div>
            </header>

            <div className='shift-swaps__grid'>
                <form className='shift-swaps-card' onSubmit={handleSubmit}>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Nueva solicitud
                            </p>
                            <h3>Proponer intercambio</h3>
                        </div>
                        <div className='shift-swaps__month'>
                            <label htmlFor='shift-swaps-month'>Mes</label>
                            <input
                                id='shift-swaps-month'
                                type='month'
                                value={month}
                                onChange={(event) =>
                                    setMonth(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className='shift-swaps-form'>
                        <label className='shift-swaps-field'>
                            <span>Servicio</span>
                            <select
                                value={formServiceId}
                                onChange={(event) =>
                                    setFormServiceId(event.target.value)
                                }
                            >
                                <option value=''>Selecciona servicio</option>
                                {services.map((svc) => {
                                    const id = svc.serviceId || svc.id;
                                    return (
                                        <option value={id} key={id}>
                                            {serviceNameMap.get(id) || id}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <label className='shift-swaps-field'>
                            <span>Tu turno</span>
                            <select
                                value={form.fromShiftId}
                                onChange={(event) =>
                                    handleFieldChange(
                                        'fromShiftId',
                                        event.target.value
                                    )
                                }
                                disabled={!formServiceId || loadingShifts}
                            >
                                <option value=''>
                                    {loadingShifts
                                        ? 'Cargando turnos...'
                                        : 'Selecciona tu turno'}
                                </option>
                                {myShifts.map((shift) => (
                                    <option key={shift.id} value={shift.id}>
                                        {formatShift(shift)}
                                    </option>
                                ))}
                            </select>
                            <small>
                                Solo aparecen tus turnos del mes seleccionado.
                            </small>
                        </label>

                        <label className='shift-swaps-field'>
                            <span>Turno del compañero</span>
                            {serviceShifts.length ? (
                                <select
                                    value={form.toShiftId}
                                    onChange={(event) =>
                                        handleToShiftChange(event.target.value)
                                    }
                                    disabled={!formServiceId || loadingShifts}
                                >
                                    <option value=''>
                                        {loadingShifts
                                            ? 'Cargando turnos...'
                                            : 'Elige turno a intercambiar'}
                                    </option>
                                    {serviceShifts
                                        .filter(
                                            (shift) =>
                                                shift.employeeId !== user?.id
                                        )
                                        .map((shift) => (
                                            <option
                                                key={shift.id}
                                                value={shift.id}
                                            >
                                                {formatShift(shift)} ·{' '}
                                                {describeUser(shift.employeeId)}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <div className='shift-swaps-inline'>
                                    <input
                                        type='text'
                                        placeholder='ID del turno'
                                        value={form.toShiftId}
                                        onChange={(event) =>
                                            handleToShiftChange(
                                                event.target.value
                                            )
                                        }
                                        disabled={!formServiceId}
                                    />
                                    <input
                                        type='text'
                                        placeholder='ID del compañero'
                                        value={form.counterpartId}
                                        onChange={(event) =>
                                            handleFieldChange(
                                                'counterpartId',
                                                event.target.value
                                            )
                                        }
                                        disabled={!formServiceId}
                                    />
                                </div>
                            )}
                            {!serviceShifts.length ? (
                                <small>
                                    Introduce los identificadores si el
                                    cuadrante del servicio no está disponible.
                                </small>
                            ) : (
                                <small>
                                    Selecciona el turno de la persona con la
                                    que quieres intercambiar.
                                </small>
                            )}
                        </label>

                        {serviceShifts.length ? (
                            <label className='shift-swaps-field'>
                                <span>Compañero</span>
                                <input
                                    type='text'
                                    readOnly
                                    value={
                                        describeUser(form.counterpartId) || ''
                                    }
                                    placeholder='Selecciona un turno primero'
                                />
                            </label>
                        ) : null}

                        <label className='shift-swaps-field'>
                            <span>Motivo (opcional)</span>
                            <textarea
                                rows={3}
                                value={form.reason}
                                onChange={(event) =>
                                    handleFieldChange(
                                        'reason',
                                        event.target.value
                                    )
                                }
                                placeholder='Breve contexto para el responsable'
                            />
                        </label>
                    </div>

                    <div className='shift-swaps-actions'>
                        <button
                            type='submit'
                            className='shift-swaps-btn shift-swaps-btn--primary'
                            disabled={creating || loadingShifts}
                        >
                            {creating ? 'Enviando...' : 'Solicitar cambio'}
                        </button>
                    </div>
                </form>

                <div className='shift-swaps-card'>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Historial
                            </p>
                            <h3>Mis solicitudes</h3>
                        </div>
                    </div>

                    {loadingRequests ? (
                        <p className='shift-swaps-empty'>Cargando...</p>
                    ) : !myRequests.length ? (
                        <p className='shift-swaps-empty'>
                            Aún no has enviado solicitudes.
                        </p>
                    ) : (
                        <ul className='shift-swaps-list'>
                            {myRequests.map((req) => (
                                <li
                                    key={req.id}
                                    className='shift-swaps-item'
                                >
                                    <div className='shift-swaps-item__head'>
                                        <div>
                                            <p className='shift-swaps-service'>
                                                {serviceNameMap.get(
                                                    req.serviceId
                                                ) || req.serviceId}
                                            </p>
                                            <p className='shift-swaps-date'>
                                                {formatDateTimeMadrid(
                                                    req.createdAt
                                                )}
                                            </p>
                                        </div>
                                        <span
                                            className={`shift-swaps-status shift-swaps-status--${req.status}`}
                                        >
                                            {statusLabels[req.status] ||
                                                req.status}
                                        </span>
                                    </div>
                                    <div className='shift-swaps-item__body'>
                                        <p>
                                            <strong>De:</strong>{' '}
                                            {describeShift(req.fromShiftId)}
                                        </p>
                                        <p>
                                            <strong>Hacia:</strong>{' '}
                                            {describeShift(req.toShiftId)}
                                        </p>
                                        <p>
                                            <strong>Compañero:</strong>{' '}
                                            {describeUser(req.counterpartId)}
                                        </p>
                                        {req.reason ? (
                                            <p className='shift-swaps-reason'>
                                                {req.reason}
                                            </p>
                                        ) : null}
                                        {req.status !== 'pending' ? (
                                            <p className='shift-swaps-resolution'>
                                                Resuelto el{' '}
                                                {formatDateTimeMadrid(
                                                    req.decidedAt
                                                ) || '—'}
                                            </p>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {isAdminLike ? (
                <div className='shift-swaps-card'>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Bandeja de aprobación
                            </p>
                            <h3>Solicitudes de empleados</h3>
                        </div>
                    </div>
                    {loadingAdmin ? (
                        <p className='shift-swaps-empty'>Cargando...</p>
                    ) : !adminRequests.length ? (
                        <p className='shift-swaps-empty'>
                            No hay solicitudes registradas.
                        </p>
                    ) : (
                        <ul className='shift-swaps-list'>
                            {adminRequests.map((req) => (
                                <li
                                    key={req.id}
                                    className='shift-swaps-item'
                                >
                                    <div className='shift-swaps-item__head'>
                                        <div>
                                            <p className='shift-swaps-service'>
                                                {serviceNameMap.get(
                                                    req.serviceId
                                                ) || req.serviceId}
                                            </p>
                                            <p className='shift-swaps-date'>
                                                {formatDateTimeMadrid(
                                                    req.createdAt
                                                )}
                                            </p>
                                            <p className='shift-swaps-meta'>
                                                Solicitante:{' '}
                                                {describeUser(req.requestorId)}{' '}
                                                · Compañero:{' '}
                                                {describeUser(req.counterpartId)}
                                            </p>
                                        </div>
                                        <span
                                            className={`shift-swaps-status shift-swaps-status--${req.status}`}
                                        >
                                            {statusLabels[req.status] ||
                                                req.status}
                                        </span>
                                    </div>
                                    <div className='shift-swaps-item__body'>
                                        <p>
                                            <strong>De:</strong>{' '}
                                            {describeShift(req.fromShiftId)}
                                        </p>
                                        <p>
                                            <strong>Hacia:</strong>{' '}
                                            {describeShift(req.toShiftId)}
                                        </p>
                                        {req.reason ? (
                                            <p className='shift-swaps-reason'>
                                                {req.reason}
                                            </p>
                                        ) : null}
                                    </div>
                                    {req.status === 'pending' ? (
                                        <div className='shift-swaps-admin'>
                                            <input
                                                type='text'
                                                placeholder='Motivo de rechazo (opcional)'
                                                value={rejectNotes[req.id] || ''}
                                                onChange={(event) =>
                                                    setRejectNotes(
                                                        (prev) => ({
                                                            ...prev,
                                                            [req.id]:
                                                                event.target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                            />
                                            <div className='shift-swaps-admin__actions'>
                                                <button
                                                    type='button'
                                                    className='shift-swaps-btn'
                                                    onClick={() =>
                                                        handleReject(req.id)
                                                    }
                                                    disabled={
                                                        actioningId === req.id
                                                    }
                                                >
                                                    {actioningId === req.id
                                                        ? 'Guardando...'
                                                        : 'Rechazar'}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='shift-swaps-btn shift-swaps-btn--primary'
                                                    onClick={() =>
                                                        handleApprove(req.id)
                                                    }
                                                    disabled={
                                                        actioningId === req.id
                                                    }
                                                >
                                                    {actioningId === req.id
                                                        ? 'Procesando...'
                                                        : 'Aprobar'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </section>
    );
};

export default ShiftSwapsComponent;
