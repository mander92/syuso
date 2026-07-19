// src/pages/Manager/components/ContractsComponent.jsx
import { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaListUl, FaSlidersH } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchClientAllServicesServices,
    fetchInProgressServices,
    fetchActiveServiceShifts,
} from '../../services/serviceService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import CalendarComponent from '../calendarComponent/CalendarComponent.jsx';
import ServiceDelegationMap from './ServiceDelegationMap.jsx';
import toast from 'react-hot-toast';
import './ContractsComponent.css';

const managedStatusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'completed', label: 'Completado' },
];

const statusLabels = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
};

const ContractsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const navigate = useNavigate();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const [data, setData] = useState([]);
    const [status, setStatus] = useState('confirmed');
    const [type, setType] = useState('');
    const [delegationId, setDelegationId] = useState('');
    const [delegations, setDelegations] = useState([]);
    const [calendarSearch, setCalendarSearch] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isServicesPanelOpen, setIsServicesPanelOpen] = useState(false);
    const [isDelegationsPanelOpen, setIsDelegationsPanelOpen] =
        useState(false);
    const [expandedDelegations, setExpandedDelegations] = useState({});
    const [activeShifts, setActiveShifts] = useState({});
    const [activeShiftLoading, setActiveShiftLoading] = useState({});
    const [loading, setLoading] = useState(false);

    const resetFilter = (e) => {
        e.preventDefault();
        setStatus('confirmed');
        setType('');
        setDelegationId('');
    };

    const compareText = (a, b) =>
        String(a || '').localeCompare(String(b || ''), 'es', {
            sensitivity: 'base',
        });

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
            const data = await fetchInProgressServices(
                authToken,
                delegationId
            );
            const services = data || [];
            if (!services.length) {
                setActiveShifts({});
                setActiveShiftLoading({});
                return;
            }

            const loadingMap = services.reduce((acc, service) => {
                const serviceId = service.serviceId || service.id;
                if (serviceId) acc[serviceId] = true;
                return acc;
            }, {});
            setActiveShiftLoading(loadingMap);

            const results = await Promise.all(
                services.map(async (service) => {
                    const serviceId = service.serviceId || service.id;
                    if (!serviceId) return null;
                    try {
                        const rows = await fetchActiveServiceShifts(
                            authToken,
                            serviceId
                        );
                        return { serviceId, rows: rows || [] };
                    } catch (error) {
                        toast.error(
                            error.message ||
                                'No se pudieron cargar los turnos abiertos'
                        );
                        return { serviceId, rows: [] };
                    }
                })
            );

            const shiftMap = results.reduce((acc, item) => {
                if (item?.serviceId) {
                    acc[item.serviceId] = item.rows || [];
                }
                return acc;
            }, {});
            setActiveShifts(shiftMap);

            const doneMap = results.reduce((acc, item) => {
                if (item?.serviceId) {
                    acc[item.serviceId] = false;
                }
                return acc;
            }, {});
            setActiveShiftLoading((prev) => ({ ...prev, ...doneMap }));
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los servicios'
            );
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
                .sort(compareText),
        [data]
    );

    const visibleServices = useMemo(() => {
        const term = calendarSearch.trim().toLowerCase();
        if (!term) return data || [];
        return (data || []).filter((service) => {
            const haystack = [
                service.name,
                service.type,
                service.status,
                statusLabels[service.status],
                service.province,
                service.city,
                service.address,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [calendarSearch, data]);

    const servicesByDelegation = useMemo(() => {
        const groups = new Map();
        visibleServices.forEach((service) => {
            const delegation = service.province || 'Sin delegacion';
            if (!groups.has(delegation)) groups.set(delegation, []);
            groups.get(delegation).push(service);
        });
        return [...groups.entries()]
            .sort(([a], [b]) => compareText(a, b))
            .map(([delegation, services]) => ({
                delegation,
                services: services.sort((a, b) =>
                    compareText(a.name || a.type, b.name || b.type)
                ),
            }));
    }, [visibleServices]);

    useEffect(() => {
        if (!servicesByDelegation.length) {
            setExpandedDelegations({});
            return;
        }
        setExpandedDelegations((prev) => {
            const next = {};
            servicesByDelegation.forEach((group) => {
                next[group.delegation] = prev[group.delegation] ?? false;
            });
            return next;
        });
    }, [servicesByDelegation]);

    const calendarEvents = useMemo(() => {
        return visibleServices
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
    }, [visibleServices]);

    const toggleDelegation = (delegation) => {
        setExpandedDelegations((prev) => ({
            ...prev,
            [delegation]: !prev[delegation],
        }));
    };

    const setAllDelegationsExpanded = (expanded) => {
        setExpandedDelegations(
            Object.fromEntries(
                servicesByDelegation.map((group) => [
                    group.delegation,
                    expanded,
                ])
            )
        );
    };

    const getServiceId = (service) => service.serviceId || service.id;

    const getOpenShiftCount = (service) => {
        const serviceId = getServiceId(service);
        return (activeShifts[serviceId] || []).length;
    };

    const getOpenShiftLabel = (service) => {
        const serviceId = getServiceId(service);
        const rows = activeShifts[serviceId] || [];
        if (!rows.length) return 'Sin turno abierto';

        const names = rows
            .map((employee) =>
                `${employee.firstName || ''} ${
                    employee.lastName || ''
                }`.trim()
            )
            .filter(Boolean);
        const prefix =
            rows.length === 1 ? 'Turno abierto' : 'Turnos abiertos';

        if (!names.length) return `${prefix} (${rows.length})`;
        return `${prefix}: ${names.join(', ')}`;
    };

    const handleSelectEvent = (event) => {
        if (isAdminLike && event?.serviceId) {
            navigate(`/services/${event.serviceId}`);
        }
    };

    const renderSearch = (className = 'contracts-calendar-search') => (
        <div className={className}>
            <input
                type='text'
                placeholder='Buscar por servicio, ciudad o delegacion'
                value={calendarSearch}
                onChange={(e) => setCalendarSearch(e.target.value)}
            />
        </div>
    );

    const renderFilters = () => (
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
                    {managedStatusOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
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
                        onChange={(e) => setDelegationId(e.target.value)}
                    >
                        <option value=''>Todas</option>
                        {delegations.map((delegation) => (
                            <option key={delegation.id} value={delegation.id}>
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
            </div>
        </form>
    );

    const renderCalendarButton = () => (
        <button
            type='button'
            className='contracts-btn'
            onClick={() => setIsCalendarOpen((prev) => !prev)}
        >
            {isCalendarOpen ? 'Ocultar calendario' : 'Mostrar calendario'}
        </button>
    );

    const renderDelegationPanel = () => (
        <div className='contracts-delegation-panel'>
            <div className='contracts-delegations-header'>
                <div>
                    <h2>Delegaciones</h2>
                    <p>
                        {visibleServices.length} servicios con los filtros
                        actuales.
                    </p>
                </div>
                <div className='contracts-delegations-actions'>
                    <button
                        type='button'
                        className='contracts-btn contracts-btn--ghost'
                        onClick={() => setAllDelegationsExpanded(false)}
                    >
                        Plegar todo
                    </button>
                    <button
                        type='button'
                        className='contracts-btn'
                        onClick={() => setAllDelegationsExpanded(true)}
                    >
                        Desplegar todo
                    </button>
                </div>
            </div>
            {servicesByDelegation.length ? (
                <div className='contracts-delegation-list'>
                    {servicesByDelegation.map((group) => (
                        <div
                            className='contracts-delegation-group'
                            key={group.delegation}
                        >
                            <button
                                type='button'
                                className='contracts-delegation-toggle'
                                onClick={() =>
                                    toggleDelegation(group.delegation)
                                }
                            >
                                <span>{group.delegation}</span>
                                <strong>{group.services.length} servicios</strong>
                                <span>
                                    {expandedDelegations[group.delegation]
                                        ? 'Ocultar'
                                        : 'Mostrar'}
                                </span>
                            </button>
                            {expandedDelegations[group.delegation] ? (
                                <div className='contracts-delegation-services'>
                                    {group.services.map((service) => {
                                        const serviceId =
                                            getServiceId(service);
                                        const openShiftCount =
                                            getOpenShiftCount(service);
                                        const isCheckingOpenShift =
                                            !!activeShiftLoading[serviceId];
                                        const showImageLink =
                                            service.scheduleView === 'image' &&
                                            service.scheduleImage;

                                        return (
                                            <article
                                                className='contracts-delegation-service'
                                                key={serviceId}
                                            >
                                                <div className='contracts-delegation-card-top'>
                                                    {showImageLink ? (
                                                        <a
                                                            className='contracts-service-top-link'
                                                            href={`${import.meta.env.VITE_API_URL}/uploads/${service.scheduleImage}`}
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            Ver foto
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type='button'
                                                            className='contracts-service-top-link'
                                                            onClick={() =>
                                                                navigate(
                                                                    `/services/${serviceId}?tab=schedule`
                                                                )
                                                            }
                                                        >
                                                            Ver cuadrante
                                                        </button>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='contracts-btn contracts-btn--ghost contracts-btn--ellipsis'
                                                        aria-label={`Opciones de ${
                                                            service.name ||
                                                            service.type ||
                                                            'servicio'
                                                        }`}
                                                        onClick={() =>
                                                            navigate(
                                                                `/services/${serviceId}`
                                                            )
                                                        }
                                                    >
                                                        ...
                                                    </button>
                                                </div>
                                                <div className='contracts-delegation-service-main'>
                                                    <span>
                                                        {service.name ||
                                                            service.type ||
                                                            'Servicio'}
                                                    </span>
                                                    <small>
                                                        {service.address}
                                                        {service.address &&
                                                        service.city
                                                            ? ', '
                                                            : ''}
                                                        {service.city}
                                                    </small>
                                                </div>
                                                <div className='contracts-delegation-service-meta'>
                                                    <span
                                                        className={`contracts-open-shift${
                                                            openShiftCount
                                                                ? ' contracts-open-shift--active'
                                                                : ''
                                                        }`}
                                                    >
                                                        {isCheckingOpenShift
                                                            ? 'Comprobando turno'
                                                            : getOpenShiftLabel(
                                                                  service
                                                              )}
                                                    </span>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : (
                <p className='contracts-loading'>
                    No hay servicios con estos filtros.
                </p>
            )}
        </div>
    );

    if (isAdminLike) {
        return (
            <section className='contracts-wrapper contracts-wrapper--map-first'>
                <section
                    className={`contracts-map-stage${
                        isServicesPanelOpen
                            ? ' contracts-map-stage--services-open'
                            : ''
                    }${
                        isDelegationsPanelOpen
                            ? ' contracts-map-stage--delegations-open'
                            : ''
                    }`}
                >
                    <ServiceDelegationMap
                        services={visibleServices}
                        authToken={authToken}
                        onOpenService={(serviceId) =>
                            navigate(`/services/${serviceId}`)
                        }
                    />

                    <div className='contracts-map-toolbar'>
                        <button
                            type='button'
                            className={`contracts-map-tool${
                                isServicesPanelOpen
                                    ? ' contracts-map-tool--active'
                                    : ''
                            }`}
                            onClick={() =>
                                setIsServicesPanelOpen((prev) => !prev)
                            }
                            aria-label='Mostrar filtros de servicios'
                            title='Servicios'
                        >
                            <FaSlidersH />
                            <span>Servicios</span>
                        </button>
                        <button
                            type='button'
                            className={`contracts-map-tool${
                                isDelegationsPanelOpen
                                    ? ' contracts-map-tool--active'
                                    : ''
                            }`}
                            onClick={() =>
                                setIsDelegationsPanelOpen((prev) => !prev)
                            }
                            aria-label='Mostrar delegaciones'
                            title='Delegaciones'
                        >
                            <FaListUl />
                            <span>Delegaciones</span>
                        </button>
                    </div>

                    {renderSearch('contracts-calendar-search contracts-map-search')}

                    {isServicesPanelOpen && (
                        <div className='contracts-floating-panel contracts-floating-panel--services'>
                            <div className='contracts-floating-panel-header'>
                                <div>
                                    <h1 className='contracts-title'>
                                        Servicios
                                    </h1>
                                    <p className='contracts-subtitle'>
                                        Filtra y visualiza los servicios.
                                    </p>
                                </div>
                                <button
                                    type='button'
                                    className='contracts-btn contracts-btn--icon'
                                    aria-label='Nuevo servicio'
                                    title='Nuevo servicio'
                                    onClick={() =>
                                        navigate('/services/createcontract')
                                    }
                                >
                                    +
                                </button>
                            </div>
                            {renderFilters()}
                            <div className='contracts-floating-panel-actions'>
                                {renderCalendarButton()}
                            </div>
                        </div>
                    )}

                    {isDelegationsPanelOpen && (
                        <div className='contracts-floating-panel contracts-floating-panel--delegations'>
                            {renderDelegationPanel()}
                        </div>
                    )}

                    {isCalendarOpen && (
                        <div className='contracts-calendar-overlay'>
                            <div className='contracts-calendar-card'>
                                <button
                                    type='button'
                                    className='contracts-calendar-close'
                                    onClick={() => setIsCalendarOpen(false)}
                                    aria-label='Cerrar calendario'
                                    title='Cerrar calendario'
                                >
                                    x
                                </button>
                                {loading ? (
                                    <p className='contracts-loading'>
                                        Cargando servicios...
                                    </p>
                                ) : (
                                    <CalendarComponent
                                        events={calendarEvents}
                                        onSelectEvent={handleSelectEvent}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </section>
        );
    }

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
            </div>

            <div className='contracts-calendar-search'>
                <input
                    type='text'
                    placeholder='Buscar por servicio, ciudad o delegacion'
                    value={calendarSearch}
                    onChange={(e) => setCalendarSearch(e.target.value)}
                />
                <div className='contracts-calendar-toggle'>
                    {renderCalendarButton()}
                </div>
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
