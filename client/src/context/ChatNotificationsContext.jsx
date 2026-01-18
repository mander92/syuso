import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from './AuthContext.jsx';
import useUser from '../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
} from '../services/serviceService.js';
import { fetchServiceChatUnreadCounts } from '../services/serviceChatService.js';
import { getChatSocket } from '../services/chatSocket.js';

const ChatNotificationsContext = createContext({
    unreadByService: {},
    unreadTotal: 0,
    resetServiceUnread: () => {},
    resetAllUnread: () => {},
});

export const ChatNotificationsProvider = ({ children }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [services, setServices] = useState([]);
    const [unreadByService, setUnreadByService] = useState({});
    const [trackedServiceIds, setTrackedServiceIds] = useState([]);
    const joinedRooms = useRef(new Set());
    const storageKey = user?.id
        ? `syuso_chat_unread_${user.id}`
        : null;

    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );

    const normalizeServices = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.data?.data)) return data.data.data;
        return [];
    };

    const serviceIds = useMemo(
        () =>
            services
                .map((service) => service.serviceId || service.id)
                .filter(Boolean),
        [services]
    );

    const serviceNameMap = useMemo(() => {
        const map = new Map();
        services.forEach((service) => {
            const id = service.serviceId || service.id;
            if (!id || map.has(id)) return;
            map.set(id, service.name || service.type || 'Servicio');
        });
        return map;
    }, [services]);

    useEffect(() => {
        if (!authToken || !user) {
            setServices([]);
            setUnreadByService({});
            setTrackedServiceIds([]);
            return;
        }

        if (user.role === 'client') {
            setServices([]);
            setUnreadByService({});
            return;
        }

        const loadServices = async () => {
            try {
                if (user.role === 'admin' || user.role === 'sudo') {
                    const data = await fetchAllServicesServices('', authToken);
                    setServices(normalizeServices(data));
                    return;
                }

                if (user.role === 'employee') {
                    const data = await fetchEmployeeAllServicesServices(
                        '',
                        authToken
                    );
                    setServices(normalizeServices(data));
                    return;
                }

                setServices([]);
            } catch {
                setServices([]);
            }
        };

        loadServices();
    }, [authToken, user]);

    useEffect(() => {
        if (!serviceIds.length) return;
        setUnreadByService((prev) => {
            const next = {};
            serviceIds.forEach((serviceId) => {
                if (prev[serviceId]) {
                    next[serviceId] = prev[serviceId];
                }
            });
            return next;
        });
    }, [serviceIds]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setUnreadByService(parsed);
            }
        } catch {
            // ignore storage errors
        }
    }, [storageKey]);

    useEffect(() => {
        if (!authToken || !user) return;
        if (user.role === 'client') return;

        const loadUnread = async () => {
            try {
                const data = await fetchServiceChatUnreadCounts(authToken);
                const counts = data?.counts || {};
                setUnreadByService(counts);
                setTrackedServiceIds(Object.keys(counts));
            } catch {
                // ignore errors to avoid blocking
            }
        };

        loadUnread();
    }, [authToken, user]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(unreadByService || {})
            );
        } catch {
            // ignore storage errors
        }
    }, [storageKey, unreadByService]);

    useEffect(() => {
        if (!socket || !user) return;
        if (user.role === 'client') return;

        const joinServiceIds = [
            ...new Set([...serviceIds, ...trackedServiceIds]),
        ];

        joinServiceIds.forEach((serviceId) => {
            if (joinedRooms.current.has(serviceId)) return;
            socket.emit('chat:join', { serviceId });
            joinedRooms.current.add(serviceId);
        });

        const handleMessage = (message) => {
            if (!message?.serviceId) return;
            if (message.userId === user.id) return;

            setUnreadByService((prev) => ({
                ...prev,
                [message.serviceId]: (prev[message.serviceId] || 0) + 1,
            }));

            const serviceName =
                serviceNameMap.get(message.serviceId) || 'Servicio';
            toast(`${serviceName}: nuevo mensaje`, {
                id: `chat-${message.id || message.serviceId}`,
            });
        };

        socket.on('chat:message', handleMessage);

        return () => {
            socket.off('chat:message', handleMessage);
            joinServiceIds.forEach((serviceId) => {
                if (!joinedRooms.current.has(serviceId)) return;
                socket.emit('chat:leave', { serviceId });
                joinedRooms.current.delete(serviceId);
            });
        };
    }, [socket, serviceIds, trackedServiceIds, user, serviceNameMap]);

    const resetServiceUnread = (serviceId) => {
        if (!serviceId) return;
        setUnreadByService((prev) => ({
            ...prev,
            [serviceId]: 0,
        }));
    };

    const resetAllUnread = () => {
        setUnreadByService({});
    };

    const unreadTotal = useMemo(
        () =>
            Object.values(unreadByService).reduce(
                (sum, value) => sum + (value || 0),
                0
            ),
        [unreadByService]
    );

    return (
        <ChatNotificationsContext.Provider
            value={{
                unreadByService,
                unreadTotal,
                resetServiceUnread,
                resetAllUnread,
            }}
        >
            {children}
        </ChatNotificationsContext.Provider>
    );
};

export const useChatNotifications = () =>
    useContext(ChatNotificationsContext);
