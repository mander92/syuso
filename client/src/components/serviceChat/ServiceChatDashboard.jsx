import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
} from '../../services/serviceService.js';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import ServiceChat from './ServiceChat.jsx';
import './ServiceChatDashboard.css';

const ServiceChatDashboard = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const { unreadByService, resetServiceUnread } = useChatNotifications();
    const [services, setServices] = useState([]);
    const [openChats, setOpenChats] = useState({});
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('confirmed');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    useEffect(() => {
        const loadServices = async () => {
            if (!authToken || !user) return;

            try {
                setLoading(true);
                if (user.role === 'admin' || user.role === 'sudo') {
                    const params = new URLSearchParams();

                    if (statusFilter !== 'all') {
                        params.append('status', statusFilter);
                    }

                    if (dateFrom) {
                        params.append('startDateFrom', dateFrom);
                    }

                    if (dateTo) {
                        params.append('startDateTo', dateTo);
                    }

                    const data = await fetchAllServicesServices(
                        params.toString(),
                        authToken
                    );
                    setServices(data?.data || []);
                    return;
                }

                if (user.role === 'employee') {
                    const data = await fetchEmployeeAllServicesServices(
                        '',
                        authToken
                    );
                    setServices(data || []);
                    return;
                }

                setServices([]);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los chats'
                );
            } finally {
                setLoading(false);
            }
        };

        loadServices();
    }, [authToken, user, statusFilter, dateFrom, dateTo]);

    const normalizedServices = useMemo(
        () => {
            const query = normalizeText(searchText);
            const uniqueMap = new Map();
            services.forEach((service) => {
                const id = service.serviceId || service.id;
                if (!id || uniqueMap.has(id)) return;
                const delegation =
                    service.province ||
                    service.delegation ||
                    service.city ||
                    '';
                const name = service.name || 'Servicio';
                uniqueMap.set(id, {
                    id,
                    name,
                    delegation,
                    displayName: delegation ? `${name} - ${delegation}` : name,
                });
            });

            return Array.from(uniqueMap.values()).filter((service) =>
                query ? normalizeText(service.name).includes(query) : true
            );
        },
        [services, searchText]
    );

    const toggleChat = (serviceId) => {
        setOpenChats((prev) => ({
            ...prev,
            [serviceId]: !prev[serviceId],
        }));
        resetServiceUnread(serviceId);
    };

    return (
        <section className='service-chat-dashboard'>
            <div className='service-chat-dashboard-header'>
                <div>
                    <h1>Chats por servicio</h1>
                    <p>Habla con el equipo asignado a cada servicio.</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'sudo') && (
                    <div className='service-chat-dashboard-filters'>
                        <div className='service-chat-dashboard-filter'>
                            <label htmlFor='chat-status'>Estado</label>
                            <select
                                id='chat-status'
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                <option value='confirmed'>Confirmados</option>
                                <option value='pending'>Pendientes</option>
                                <option value='completed'>Completados</option>
                                <option value='all'>Todos</option>
                            </select>
                        </div>
                        <div className='service-chat-dashboard-filter'>
                            <label htmlFor='chat-date-from'>Desde</label>
                            <input
                                id='chat-date-from'
                                type='date'
                                value={dateFrom}
                                onChange={(event) =>
                                    setDateFrom(event.target.value)
                                }
                            />
                        </div>
                        <div className='service-chat-dashboard-filter'>
                            <label htmlFor='chat-date-to'>Hasta</label>
                            <input
                                id='chat-date-to'
                                type='date'
                                value={dateTo}
                                onChange={(event) =>
                                    setDateTo(event.target.value)
                                }
                            />
                        </div>
                        <div className='service-chat-dashboard-filter'>
                            <label htmlFor='chat-search'>
                                Buscar por servicio
                            </label>
                            <input
                                id='chat-search'
                                type='text'
                                placeholder='Escribe el nombre...'
                                value={searchText}
                                onChange={(event) =>
                                    setSearchText(event.target.value)
                                }
                            />
                        </div>
                    </div>
                )}
            </div>

            {user?.role === 'client' ? (
                <p className='service-chat-dashboard-empty'>
                    El chat solo esta disponible para el personal interno.
                </p>
            ) : loading ? (
                <p className='service-chat-dashboard-loading'>
                    Cargando chats...
                </p>
            ) : normalizedServices.length ? (
                <div className='service-chat-dashboard-list'>
                    {normalizedServices.map((service) => (
                        <div
                            key={service.id}
                            className='service-chat-dashboard-card'
                        >
                            <div className='service-chat-dashboard-card-row'>
                                <h3>{service.displayName || service.name}</h3>
                                <button
                                    type='button'
                                    className='service-chat-dashboard-btn'
                                    onClick={() => toggleChat(service.id)}
                                >
                                    {openChats[service.id]
                                        ? 'Cerrar chat'
                                        : 'Abrir chat'}
                                    {unreadByService?.[service.id] ? (
                                        <span className='service-chat-badge'>
                                            {unreadByService[service.id]}
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                            {openChats[service.id] && (
                                <ServiceChat
                                    serviceId={service.id}
                                    title={`Chat: ${service.name}`}
                                    compact
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className='service-chat-dashboard-empty'>
                    No hay servicios disponibles.
                </p>
            )}
        </section>
    );
};

export default ServiceChatDashboard;
