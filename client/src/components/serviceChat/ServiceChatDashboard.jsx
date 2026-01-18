import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
} from '../../services/serviceService.js';
import { getChatSocket } from '../../services/chatSocket.js';
import ServiceChat from './ServiceChat.jsx';
import './ServiceChatDashboard.css';

const ServiceChatDashboard = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [services, setServices] = useState([]);
    const [openChats, setOpenChats] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const joinedRooms = useRef(new Set());
    const openChatsRef = useRef({});

    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    const escapeRegExp = (value) =>
        String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const hasMentionForUser = (messageText) => {
        if (!messageText || !user) return false;
        const normalized = normalizeText(messageText);
        if (!normalized) return false;
        const firstName = normalizeText(user.firstName);
        const lastName = normalizeText(user.lastName);
        const fullName = normalizeText(
            `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
        const patterns = [];
        if (fullName) {
            patterns.push(
                new RegExp(`@${escapeRegExp(fullName)}(\\s|$)`)
            );
        }
        if (firstName) {
            patterns.push(
                new RegExp(`@${escapeRegExp(firstName)}(\\s|$)`)
            );
        }
        if (lastName) {
            patterns.push(
                new RegExp(`@${escapeRegExp(lastName)}(\\s|$)`)
            );
        }
        return patterns.some((pattern) => pattern.test(normalized));
    };

    useEffect(() => {
        const loadServices = async () => {
            if (!authToken || !user) return;

            try {
                setLoading(true);
                if (user.role === 'admin' || user.role === 'sudo') {
                    const data = await fetchAllServicesServices('', authToken);
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
    }, [authToken, user]);

    useEffect(() => {
        if (!socket || !user) return;
        if (user.role === 'client') return;

        const serviceIds = services
            .map((service) => service.serviceId || service.id)
            .filter(Boolean);

        serviceIds.forEach((serviceId) => {
            if (joinedRooms.current.has(serviceId)) return;
            socket.emit('chat:join', { serviceId }, (response) => {
                if (response?.ok === false) {
                    toast.error(
                        response.message || 'No se pudo unir al chat'
                    );
                }
            });
            joinedRooms.current.add(serviceId);
        });

        const handleMessage = (message) => {
            if (!message?.serviceId) return;
            if (message.userId === user.id) return;
            if (!serviceIds.includes(message.serviceId)) return;

            const isMention = hasMentionForUser(message.message);

            setUnreadCounts((prev) => {
                const current = prev[message.serviceId] || 0;
                if (openChatsRef.current[message.serviceId]) return prev;
                return {
                    ...prev,
                    [message.serviceId]: current + 1,
                };
            });

            const name =
                services.find(
                    (service) =>
                        (service.serviceId || service.id) ===
                        message.serviceId
                )?.name || 'Servicio';

            if (isMention) {
                toast(`${name}: te han mencionado`, {
                    id: `mention-${message.id}`,
                });
                return;
            }

            if (!openChatsRef.current[message.serviceId]) {
                toast(`${name}: nuevo mensaje`, { id: message.id });
            }
        };

        socket.on('chat:message', handleMessage);

        return () => {
            socket.off('chat:message', handleMessage);
            serviceIds.forEach((serviceId) => {
                if (!joinedRooms.current.has(serviceId)) return;
                socket.emit('chat:leave', { serviceId });
                joinedRooms.current.delete(serviceId);
            });
        };
    }, [socket, services, user]);

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
        setUnreadCounts((prev) => ({
            ...prev,
            [serviceId]: 0,
        }));
    };

    useEffect(() => {
        openChatsRef.current = openChats;
    }, [openChats]);

    return (
        <section className='service-chat-dashboard'>
            <div className='service-chat-dashboard-header'>
                <div>
                    <h1>Chats por servicio</h1>
                    <p>Habla con el equipo asignado a cada servicio.</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'sudo') && (
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
                                    {unreadCounts[service.id] ? (
                                        <span className='service-chat-badge'>
                                            {unreadCounts[service.id]}
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                            {openChats[service.id] && (
                                <ServiceChat
                                    serviceId={service.id}
                                    title={`Chat: ${service.name}`}
                                    compact
                                    manageRoom={false}
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
