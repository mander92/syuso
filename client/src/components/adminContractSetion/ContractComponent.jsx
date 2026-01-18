// src/pages/Manager/components/ContractsComponent.jsx
import { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchClientAllServicesServices,
    fetchInProgressServices,
    fetchActiveServiceShifts,
    uploadServiceScheduleImage,
    fetchUpdateServiceStatus,
} from '../../services/serviceService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import CalendarComponent from '../calendarComponent/CalendarComponent.jsx';
import toast from 'react-hot-toast';
import './ContractsComponent.css';

const ContractsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const navigate = useNavigate();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const [data, setData] = useState([]);
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [delegationId, setDelegationId] = useState('');
    const [delegations, setDelegations] = useState([]);
    const [activeServiceSearch, setActiveServiceSearch] = useState('');
    const [calendarSearch, setCalendarSearch] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(true);
    const [activeServices, setActiveServices] = useState([]);
    const [activeLoading, setActiveLoading] = useState(false);
    const [expandedActive, setExpandedActive] = useState({});
    const [activeShifts, setActiveShifts] = useState({});
    const [activeShiftLoading, setActiveShiftLoading] = useState({});
    const [loading, setLoading] = useState(false);

    const handleToggleLegend = (e) => {
        e.preventDefault();
        setIsVisible((prev) => !prev);
    };

    const resetFilter = (e) => {
        e.preventDefault();
        setStatus('');
        setType('');
        setDelegationId('');
    };

    useEffect(() => {
        const getServices = async () => {
            try {
                setLoading(true);

                const searchParams = new URLSearchParams({
                    status: status,
                    type: type,
                });

                if (delegationId) {
                    searchParams.append('delegationId', delegationId);
                }

                const searchParamsToString = searchParams.toString();

                if (user?.role === 'client') {
                    const response = await fetchClientAllServicesServices(
                        searchParamsToString,
                        authToken
                    );
                    setData(response || []);
                    return;
                }

                const response = await fetchAllServicesServices(
                    searchParamsToString,
                    authToken
                );

                setData(response?.data || []);
            } catch (error) {
                toast.error(error.message || 'Error al cargar servicios', {
                    id: 'error',
                });
            } finally {
                setLoading(false);
            }
        };

        if (authToken && user) {
            getServices();
        }
    }, [status, type, delegationId, authToken, user]);

    useEffect(() => {
        const loadDelegations = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                const data = await fetchDelegations(authToken);
                setDelegations(data);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar delegaciones'
                );
            }
        };

        loadDelegations();
    }, [authToken, isAdminLike]);

    const loadActiveServices = async () => {
        if (!authToken || !user || !isAdminLike) return;

        try {
            setActiveLoading(true);
            const data = await fetchInProgressServices(
                authToken,
                delegationId
            );
            setActiveServices(data || []);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los servicios'
            );
        } finally {
            setActiveLoading(false);
        }
    };

    useEffect(() => {
        if (authToken && isAdminLike) {
            loadActiveServices();
        }
    }, [authToken, user, delegationId, isAdminLike]);

    const typeNoRepeated = useMemo(
        () =>
            [...new Set(data.map((item) => item.type))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
        [data]
    );

    const scheduleServices = useMemo(
        () =>
            (data || [])
                .filter((item) => item.scheduleImage)
                .map((item) => ({
                    id: item.serviceId || item.id,
                    name: item.name || item.type,
                    scheduleImage: item.scheduleImage,
                    address: item.address,
                    city: item.city,
                }))
                .filter((item) => item.id),
        [data]
    );

    const filteredActiveServices = useMemo(() => {
        const term = activeServiceSearch.trim().toLowerCase();
        if (!term) return activeServices;
        return activeServices.filter((service) =>
            (service.name || service.type || '')
                .toLowerCase()
                .includes(term)
        );
    }, [activeServices, activeServiceSearch]);

    const calendarEvents = useMemo(() => {
        const term = calendarSearch.trim().toLowerCase();
        return data
            .filter((event) => {
                if (!term) return true;
                const name = (event.name || event.type || '').toLowerCase();
                return name.includes(term);
            })
            .map((event) => {
                const start = new Date(event.startDateTime);
                let end = event.endDateTime
                    ? new Date(event.endDateTime)
                    : new Date(start);

                if (!event.endDateTime) {
                    const hours = Number(event.hours) || 1;
                    end.setHours(end.getHours() + hours);
                }

                return {
                    title: event.name || event.type,
                    start,
                    end,
                    allDay: false,
                    serviceId: event.serviceId || event.id,
                    status: event.status,
                };
            });
    }, [data, calendarSearch]);

    const handleSelectEvent = (event) => {
        if (isAdminLike && event?.serviceId) {
            navigate(`/services/${event.serviceId}`);
        }
    };

    const handleToggleActive = async (serviceId) => {
        const willOpen = !expandedActive[serviceId];
        setExpandedActive((prev) => ({
            ...prev,
            [serviceId]: willOpen,
        }));

        if (!willOpen || activeShifts[serviceId]) return;

        try {
            setActiveShiftLoading((prev) => ({
                ...prev,
                [serviceId]: true,
            }));
            const rows = await fetchActiveServiceShifts(authToken, serviceId);
            setActiveShifts((prev) => ({
                ...prev,
                [serviceId]: rows || [],
            }));
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los turnos abiertos'
            );
        } finally {
            setActiveShiftLoading((prev) => ({
                ...prev,
                [serviceId]: false,
            }));
        }
    };


    const handleScheduleUpload = async (serviceId, file) => {
        if (!file) return;
        if (file.type !== 'image/png') {
            toast.error('El cuadrante debe ser PNG');
            return;
        }

        try {
            const data = await uploadServiceScheduleImage(
                authToken,
                serviceId,
                file
            );
            setActiveServices((prev) =>
                prev.map((service) =>
                    service.serviceId === serviceId
                        ? { ...service, scheduleImage: data.scheduleImage }
                        : service
                )
            );
            toast.success('Cuadrante actualizado');
        } catch (error) {
            toast.error(
                error.message || 'No se pudo subir el cuadrante'
            );
        }
    };


    return (
        <section className='contracts-wrapper'>
            <div className='contracts-header'>
                <div>
                    <h1 className='contracts-title'>Servicios</h1>
                    <p className='contracts-subtitle'>
                        {user?.role === 'client'
                            ? 'Consulta tus servicios en el calendario.'
                            : 'Filtra y visualiza los servicios en el calendario.'}
                    </p>
                </div>

                {user?.role !== 'client' && (
                    <form className='contracts-filters'>
                        <div className='contracts-filter'>
                        <label htmlFor='status'>Estado</label>
                        <select
                            name='status'
                            id='status'
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            <option value='accepted'>Aceptado</option>
                            <option value='canceled'>Cancelado</option>
                            <option value='completed'>Completado</option>
                            <option value='confirmed'>Confirmado</option>
                            <option value='pending'>Pendiente</option>
                            <option value='rejected'>Rechazado</option>
                        </select>
                        </div>

                        <div className='contracts-filter'>
                        <label htmlFor='typeOfService'>Tipo de servicio</label>
                        <select
                            name='typeOfService'
                            id='typeOfService'
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            {typeNoRepeated.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                        </div>
                        {isAdminLike && (
                            <div className='contracts-filter'>
                                <label htmlFor='delegationId'>Delegacion</label>
                                <select
                                    id='delegationId'
                                    value={delegationId}
                                    onChange={(e) =>
                                        setDelegationId(e.target.value)
                                    }
                                >
                                    <option value=''>Todas</option>
                                    {delegations.map((delegation) => (
                                        <option
                                            key={delegation.id}
                                            value={delegation.id}
                                        >
                                            {delegation.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className='contracts-filter-actions'>
                        <button
                            className='contracts-btn contracts-btn--ghost'
                            onClick={resetFilter}
                        >
                            Limpiar filtros
                        </button>
                        <button
                            className='contracts-btn'
                            onClick={handleToggleLegend}
                        >
                            {isVisible ? 'Ocultar colores' : 'Mostrar colores'}
                        </button>
                        </div>
                    </form>
                )}
            </div>

            {isVisible && user?.role !== 'client' && (
                <div className='contracts-legend'>
                    <span className='contracts-legend-badge contracts-legend-badge--pending'>
                        Pendiente
                    </span>
                    <span className='contracts-legend-badge contracts-legend-badge--accepted'>
                        Aceptado
                    </span>
                    <span className='contracts-legend-badge contracts-legend-badge--confirmed'>
                        Confirmado
                    </span>
                    <span className='contracts-legend-badge contracts-legend-badge--completed'>
                        Completado
                    </span>
                    <span className='contracts-legend-badge contracts-legend-badge--rejected'>
                        Rechazado
                    </span>
                    <span className='contracts-legend-badge contracts-legend-badge--canceled'>
                        Cancelado
                    </span>
                </div>
            )}

            {isAdminLike && (
                <section className='contracts-active'>
                    <div className='contracts-active-header'>
                        <div>
                            <h2>Servicios activos</h2>
                            <p>Servicios con estado confirmado.</p>
                        </div>
                        <div className='contracts-active-filters'>
                            <input
                                type='text'
                                placeholder='Buscar servicio'
                                value={activeServiceSearch}
                                onChange={(e) =>
                                    setActiveServiceSearch(e.target.value)
                                }
                            />
                            <select
                                value={delegationId}
                                onChange={(e) =>
                                    setDelegationId(e.target.value)
                                }
                            >
                                <option value=''>Todas las delegaciones</option>
                                {delegations.map((delegation) => (
                                    <option
                                        key={delegation.id}
                                        value={delegation.id}
                                    >
                                        {delegation.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type='button'
                                className='contracts-btn'
                                onClick={loadActiveServices}
                                disabled={activeLoading}
                            >
                                {activeLoading
                                    ? 'Actualizando...'
                                    : 'Actualizar'}
                            </button>
                        </div>
                    </div>

                    {activeLoading ? (
                        <p className='contracts-loading'>
                            Cargando servicios activos...
                        </p>
                    ) : filteredActiveServices.length ? (
                        <div className='contracts-active-list'>
                            {filteredActiveServices.map((service) => (
                                <article
                                    key={service.serviceId}
                                    className='contracts-active-card'
                                >
                                    <div className='contracts-active-card-row'>
                                        <div className='contracts-active-card-top'>
                                            {service.scheduleImage ? (
                                                <a
                                                    className='contracts-active-top-link'
                                                    href={`${import.meta.env.VITE_API_URL}/uploads/${service.scheduleImage}`}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    Ver cuadrante actual
                                                </a>
                                            ) : (
                                                <span className='contracts-active-top-placeholder' />
                                            )}
                                            <button
                                                type='button'
                                                className='contracts-btn contracts-btn--ghost contracts-btn--ellipsis'
                                                aria-label='Detalle del servicio'
                                                onClick={() =>
                                                    navigate(
                                                        `/services/${service.serviceId}`
                                                    )
                                                }
                                            >
                                                ...
                                            </button>
                                        </div>
                                        <div>
                                            <h3>
                                                {service.name || service.type}
                                            </h3>
                                            <p>
                                                {service.address},{' '}
                                                {service.city}
                                            </p>
                                        </div>
                                        <div className='contracts-active-actions'>
                                            <button
                                                type='button'
                                                className='contracts-btn'
                                                onClick={() =>
                                                    handleToggleActive(
                                                        service.serviceId
                                                    )
                                                }
                                            >
                                                {expandedActive[
                                                    service.serviceId
                                                ]
                                                    ? 'Ocultar turnos'
                                                    : 'Turnos abiertos'}
                                            </button>
                                            <label className='contracts-upload contracts-btn contracts-btn--ghost'>
                                                Subir cuadrante
                                                <input
                                                    type='file'
                                                    accept='image/png'
                                                    onChange={(event) =>
                                                        Promise.resolve(
                                                            handleScheduleUpload(
                                                                service.serviceId,
                                                                event.target
                                                                    .files?.[0]
                                                            )
                                                        ).finally(() => {
                                                            event.target.value =
                                                                '';
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </div>

                                            {expandedActive[service.serviceId] && (
                                        <div className='contracts-active-employees'>
                                            {activeShiftLoading[service.serviceId] ? (
                                                <p className='contracts-loading'>
                                                    Cargando turnos abiertos...
                                                </p>
                                            ) : (activeShifts[service.serviceId] || []).length ? (
                                                activeShifts[service.serviceId].map(
                                                    (employee) => (
                                                        <div
                                                            key={
                                                                employee.shiftId ||
                                                                employee.employeeId
                                                            }
                                                            className='contracts-active-employee'
                                                        >
                                                            <span className='contracts-active-person'>
                                                                <span className='contracts-active-dot' />
                                                                {employee.firstName}{' '}
                                                                {employee.lastName}
                                                            </span>
                                                            <span>
                                                                Turno abierto
                                                            </span>
                                                        </div>
                                                    )
                                                )
                                    ) : (
                                        <p className='contracts-loading'>
                                            Sin turnos abiertos.
                                        </p>
                                    )}
                                </div>
                            )}

                        </article>
                    ))}
                </div>
                    ) : (
                        <p className='contracts-loading'>
                            No hay servicios activos.
                        </p>
                    )}
                </section>
            )}

            <div className='contracts-calendar-search'>
                <div className='contracts-calendar-toggle'>
                    <button
                        type='button'
                        className='contracts-btn'
                        onClick={() =>
                            setIsCalendarOpen((prev) => !prev)
                        }
                    >
                        {isCalendarOpen
                            ? 'Ocultar calendario'
                            : 'Mostrar calendario'}
                    </button>
                </div>
                {isCalendarOpen && (
                    <input
                        type='text'
                        placeholder='Buscar servicio'
                        value={calendarSearch}
                        onChange={(e) => setCalendarSearch(e.target.value)}
                    />
                )}
            </div>

            {isCalendarOpen && (
                <div className='contracts-calendar-card'>
                    {loading ? (
                        <p className='contracts-loading'>Cargando servicios...</p>
                    ) : (
                        <CalendarComponent
                            events={calendarEvents}
                            onSelectEvent={handleSelectEvent}
                        />
                    )}
                </div>
            )}

        </section>
    );
};

export default ContractsComponent;
