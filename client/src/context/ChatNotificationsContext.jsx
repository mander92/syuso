import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AuthContext } from './AuthContext.jsx';
import useUser from '../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
} from '../services/serviceService.js';
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
    const joinedRooms = useRef(new Set());

    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );

    const serviceIds = useMemo(
        () =>
            services
                .map((service) => service.serviceId || service.id)
                .filter(Boolean),
        [services]
    );

    useEffect(() => {
        if (!authToken || !user) {
            setServices([]);
            setUnreadByService({});
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
            } catch {
                setServices([]);
            }
        };

        loadServices();
    }, [authToken, user]);

    useEffect(() => {
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
        if (!socket || !user) return;
        if (user.role === 'client') return;

        serviceIds.forEach((serviceId) => {
            if (joinedRooms.current.has(serviceId)) return;
            socket.emit('chat:join', { serviceId });
            joinedRooms.current.add(serviceId);
        });

        const handleMessage = (message) => {
            if (!message?.serviceId) return;
            if (message.userId === user.id) return;
            if (!serviceIds.includes(message.serviceId)) return;

            setUnreadByService((prev) => ({
                ...prev,
                [message.serviceId]: (prev[message.serviceId] || 0) + 1,
            }));
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
    }, [socket, serviceIds, user]);

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
