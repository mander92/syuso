import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    acceptAcknowledgement,
    createAcknowledgement,
    fetchAcknowledgementsAudit,
    fetchMyAcknowledgements,
    markAcknowledgementSeen,
} from '../../services/acknowledgementService.js';
import { getChatSocket } from '../../services/chatSocket.js';
import './AcknowledgementsComponent.css';

const subjectLabels = {
    communication: 'Comunicacion',
    service_assignment: 'Asignacion de servicio',
    schedule: 'Cuadrante',
    document: 'Documento',
    payroll: 'Nomina',
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getEmployeeName = (employee) =>
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email ||
    'Trabajador';

const AcknowledgementsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const userRole = String(user?.role || '').toLowerCase();
    const isAdminLike = userRole === 'admin' || userRole === 'sudo';
    const [myAcknowledgements, setMyAcknowledgements] = useState([]);
    const [auditRows, setAuditRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [auditFilters, setAuditFilters] = useState({
        subjectType: '',
        status: '',
        employeeId: '',
    });
    const [form, setForm] = useState({
        title: '',
        message: '',
        recipientUserIds: [],
    });

    const employeeOptions = useMemo(
        () =>
            employees
                .filter((employee) => employee.role === 'employee')
                .map((employee) => ({
                    value: employee.id,
                    label: getEmployeeName(employee),
                    email: employee.email,
                    city: employee.city,
                })),
        [employees]
    );

    const loadMine = useCallback(async () => {
        if (!authToken) return;
        const data = await fetchMyAcknowledgements(authToken);
        setMyAcknowledgements(Array.isArray(data) ? data : []);
    }, [authToken]);

    const loadAudit = useCallback(async () => {
        if (!authToken || !isAdminLike) return;
        const data = await fetchAcknowledgementsAudit(authToken, auditFilters);
        setAuditRows(Array.isArray(data) ? data : []);
    }, [authToken, auditFilters, isAdminLike]);

    useEffect(() => {
        if (!authToken) return;
        setLoading(true);
        Promise.all([
            loadMine(),
            isAdminLike
                ? fetchAllUsersServices('role=employee&active=1', authToken).then(
                      (data) => setEmployees(Array.isArray(data) ? data : [])
                  )
                : Promise.resolve(),
        ])
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, [authToken, isAdminLike, loadMine]);

    useEffect(() => {
        loadAudit().catch((error) => toast.error(error.message));
    }, [loadAudit]);

    useEffect(() => {
        if (!authToken) return undefined;

        const socket = getChatSocket(authToken);
        if (!socket) return undefined;

        const handleAcknowledgementCreated = () => {
            loadMine().catch((error) => toast.error(error.message));
            if (isAdminLike) {
                loadAudit().catch((error) => toast.error(error.message));
            }
        };

        socket.on('acknowledgement:created', handleAcknowledgementCreated);

        return () => {
            socket.off('acknowledgement:created', handleAcknowledgementCreated);
        };
    }, [authToken, isAdminLike, loadAudit, loadMine]);

    const pendingMine = myAcknowledgements.filter((item) => !item.acceptedAt);

    const handleSeen = async (acknowledgementId) => {
        try {
            await markAcknowledgementSeen(authToken, acknowledgementId);
            await loadMine();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleAccept = async (acknowledgementId) => {
        try {
            await acceptAcknowledgement(authToken, acknowledgementId);
            await loadMine();
            if (isAdminLike) await loadAudit();
            toast.success('Acuse aceptado');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleCreateCommunication = async (event) => {
        event.preventDefault();
        if (!form.recipientUserIds.length) {
            toast.error('Selecciona al menos un trabajador');
            return;
        }
        try {
            await createAcknowledgement(authToken, {
                subjectType: 'communication',
                title: form.title,
                message: form.message,
                recipientUserIds: form.recipientUserIds,
                requiresAcceptance: true,
                push: true,
            });
            setForm({ title: '', message: '', recipientUserIds: [] });
            await loadAudit();
            toast.success('Comunicacion enviada con acuse');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const toggleRecipient = (employeeId) => {
        setForm((prev) => ({
            ...prev,
            recipientUserIds: prev.recipientUserIds.includes(employeeId)
                ? prev.recipientUserIds.filter((id) => id !== employeeId)
                : [...prev.recipientUserIds, employeeId],
        }));
    };

    return (
        <section className='acknowledgements'>
            <header className='acknowledgements__header'>
                <div>
                    <p>Acuses</p>
                    <h2>Recibos y aceptaciones</h2>
                </div>
                <span>{pendingMine.length} pendiente(s)</span>
            </header>

            <div className='acknowledgements__grid'>
                <div className='acknowledgements__panel'>
                    <h3>Mis acuses pendientes</h3>
                    {loading ? (
                        <p>Cargando...</p>
                    ) : pendingMine.length ? (
                        <div className='acknowledgements__cards'>
                            {pendingMine.map((item) => (
                                <article
                                    key={item.recipientId}
                                    className='acknowledgement-card'
                                >
                                    <div>
                                        <span>
                                            {subjectLabels[item.subjectType] ||
                                                item.subjectType}
                                        </span>
                                        <h4>{item.title}</h4>
                                        <p>{item.message}</p>
                                    </div>
                                    <small>
                                        Enviado: {formatDate(item.createdAt)}
                                    </small>
                                    <div className='acknowledgement-card__actions'>
                                        {item.url ? (
                                            <button
                                                type='button'
                                                onClick={async () => {
                                                    await handleSeen(item.id);
                                                    window.location.href = item.url;
                                                }}
                                            >
                                                Ver
                                            </button>
                                        ) : null}
                                        <button
                                            type='button'
                                            onClick={() => handleAccept(item.id)}
                                        >
                                            Aceptar acuse
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p>No tienes acuses pendientes.</p>
                    )}
                </div>

                {isAdminLike ? (
                    <form
                        className='acknowledgements__panel acknowledgements__form'
                        onSubmit={handleCreateCommunication}
                    >
                        <h3>Nueva comunicacion con acuse</h3>
                        <label>
                            Asunto
                            <input
                                value={form.title}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        title: event.target.value,
                                    }))
                                }
                                maxLength={180}
                                required
                            />
                        </label>
                        <label>
                            Mensaje
                            <textarea
                                value={form.message}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        message: event.target.value,
                                    }))
                                }
                                maxLength={2000}
                                rows={4}
                            />
                        </label>
                        <div className='acknowledgements__recipients'>
                            {employeeOptions.map((employee) => (
                                <label key={employee.value}>
                                    <input
                                        type='checkbox'
                                        checked={form.recipientUserIds.includes(
                                            employee.value
                                        )}
                                        onChange={() =>
                                            toggleRecipient(employee.value)
                                        }
                                    />
                                    <span>
                                        <strong>{employee.label}</strong>
                                        <small>
                                            {employee.email}
                                            {employee.city
                                                ? ` - ${employee.city}`
                                                : ''}
                                        </small>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <button type='submit'>Enviar con acuse</button>
                    </form>
                ) : null}
            </div>

            {isAdminLike ? (
                <div className='acknowledgements__panel'>
                    <div className='acknowledgements__audit-header'>
                        <h3>Auditoria de acuses</h3>
                        <div>
                            <select
                                value={auditFilters.subjectType}
                                onChange={(event) =>
                                    setAuditFilters((prev) => ({
                                        ...prev,
                                        subjectType: event.target.value,
                                    }))
                                }
                            >
                                <option value=''>Todos los tipos</option>
                                {Object.entries(subjectLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                            <select
                                value={auditFilters.status}
                                onChange={(event) =>
                                    setAuditFilters((prev) => ({
                                        ...prev,
                                        status: event.target.value,
                                    }))
                                }
                            >
                                <option value=''>Todos los estados</option>
                                <option value='pending'>Pendiente</option>
                                <option value='seen'>Visto</option>
                                <option value='accepted'>Aceptado</option>
                            </select>
                            <select
                                value={auditFilters.employeeId}
                                onChange={(event) =>
                                    setAuditFilters((prev) => ({
                                        ...prev,
                                        employeeId: event.target.value,
                                    }))
                                }
                            >
                                <option value=''>Todos los trabajadores</option>
                                {employeeOptions.map((employee) => (
                                    <option
                                        key={employee.value}
                                        value={employee.value}
                                    >
                                        {employee.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className='acknowledgements__table-wrap'>
                        <table className='acknowledgements__table'>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Asunto</th>
                                    <th>Trabajador</th>
                                    <th>Estado</th>
                                    <th>Visto</th>
                                    <th>Aceptado</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditRows.map((row) => {
                                    const employeeName =
                                        `${row.firstName || ''} ${
                                            row.lastName || ''
                                        }`.trim() ||
                                        row.email ||
                                        row.userId;
                                    const status = row.acceptedAt
                                        ? 'Aceptado'
                                        : row.seenAt
                                          ? 'Visto'
                                          : 'Pendiente';
                                    return (
                                        <tr key={row.recipientId}>
                                            <td>{formatDate(row.createdAt)}</td>
                                            <td>
                                                {subjectLabels[
                                                    row.subjectType
                                                ] || row.subjectType}
                                            </td>
                                            <td>{row.title}</td>
                                            <td>
                                                {employeeName}
                                                <small>{row.email}</small>
                                            </td>
                                            <td>{status}</td>
                                            <td>{formatDate(row.seenAt)}</td>
                                            <td>{formatDate(row.acceptedAt)}</td>
                                            <td>{row.lastIp || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default AcknowledgementsComponent;
