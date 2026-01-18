import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from './AuthContext.jsx';
import useUser from '../hooks/useUser.js';
import {
    fetchAllServicesServices,
    fetchEmployeeAllServicesServices,
} from '../services/serviceService.js';
import { fetchServiceChatUnreadCounts } from '../services/serviceChatService.js';
import {
    fetchGeneralChatUnreadCounts,
    fetchGeneralChats,
} from '../services/generalChatService.js';
import { getChatSocket } from '../services/chatSocket.js';

const ChatNotificationsContext = createContext({
    unreadByService: {},
    unreadByGeneral: {},
    unreadTotal: 0,
    resetServiceUnread: () => {},
    resetGeneralUnread: () => {},
    resetAllUnread: () => {},
});

export const ChatNotificationsProvider = ({ children }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [services, setServices] = useState([]);
    const [unreadByService, setUnreadByService] = useState({});
    const [trackedServiceIds, setTrackedServiceIds] = useState([]);
    const [generalChats, setGeneralChats] = useState([]);
    const [unreadByGeneral, setUnreadByGeneral] = useState({});
    const [trackedGeneralChatIds, setTrackedGeneralChatIds] = useState([]);
    const joinedServiceRooms = useRef(new Set());
    const joinedGeneralRooms = useRef(new Set());
    const storageKey = user?.id
        ? `syuso_chat_unread_${user.id}`
        : null;
    const generalStorageKey = user?.id
        ? `syuso_chat_unread_general_${user.id}`
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

    const generalChatIds = useMemo(
        () => generalChats.map((chat) => chat.id).filter(Boolean),
        [generalChats]
    );

    const generalChatNameMap = useMemo(() => {
        const map = new Map();
        generalChats.forEach((chat) => {
            if (!chat?.id || map.has(chat.id)) return;
            map.set(chat.id, chat.name || 'Chat');
        });
        return map;
    }, [generalChats]);

    useEffect(() => {
        if (!authToken || !user) {
            setServices([]);
            setUnreadByService({});
            setTrackedServiceIds([]);
            setGeneralChats([]);
            setUnreadByGeneral({});
            setTrackedGeneralChatIds([]);
            return;
        }

        if (user.role === 'client') {
            setServices([]);
            setUnreadByService({});
            setGeneralChats([]);
            setUnreadByGeneral({});
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
        if (!authToken || !user) return;
        if (user.role === 'client') return;

        const loadGeneralChats = async () => {
            try {
                const data = await fetchGeneralChats(authToken);
                setGeneralChats(Array.isArray(data) ? data : []);
            } catch {
                setGeneralChats([]);
            }
        };

        loadGeneralChats();
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
        if (!generalChatIds.length) return;
        setUnreadByGeneral((prev) => {
            const next = {};
            generalChatIds.forEach((chatId) => {
                if (prev[chatId]) {
                    next[chatId] = prev[chatId];
                }
            });
            return next;
        });
    }, [generalChatIds]);

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
        if (!generalStorageKey) return;
        try {
            const raw = localStorage.getItem(generalStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setUnreadByGeneral(parsed);
            }
        } catch {
            // ignore storage errors
        }
    }, [generalStorageKey]);

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
        if (!authToken || !user) return;
        if (user.role === 'client') return;

        const loadGeneralUnread = async () => {
            try {
                const data = await fetchGeneralChatUnreadCounts(authToken);
                const counts = data?.counts || {};
                setUnreadByGeneral(counts);
                setTrackedGeneralChatIds(Object.keys(counts));
            } catch {
                // ignore errors to avoid blocking
            }
        };

        loadGeneralUnread();
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
        if (!generalStorageKey) return;
        try {
            localStorage.setItem(
                generalStorageKey,
                JSON.stringify(unreadByGeneral || {})
            );
        } catch {
            // ignore storage errors
        }
    }, [generalStorageKey, unreadByGeneral]);

    useEffect(() => {
        if (!socket || !user) return;
        if (user.role === 'client') return;

        const joinServiceIds = [
            ...new Set([...serviceIds, ...trackedServiceIds]),
        ];

        joinServiceIds.forEach((serviceId) => {
            if (joinedServiceRooms.current.has(serviceId)) return;
            socket.emit('chat:join', { serviceId });
            joinedServiceRooms.current.add(serviceId);
        });

        const joinGeneralChatIds = [
            ...new Set([...generalChatIds, ...trackedGeneralChatIds]),
        ];

        joinGeneralChatIds.forEach((chatId) => {
            if (joinedGeneralRooms.current.has(chatId)) return;
            socket.emit('generalChat:join', { chatId });
            joinedGeneralRooms.current.add(chatId);
        });

        const joinRooms = () => {
            joinServiceIds.forEach((serviceId) => {
                if (joinedServiceRooms.current.has(serviceId)) return;
                socket.emit('chat:join', { serviceId });
                joinedServiceRooms.current.add(serviceId);
            });
            joinGeneralChatIds.forEach((chatId) => {
                if (joinedGeneralRooms.current.has(chatId)) return;
                socket.emit('generalChat:join', { chatId });
                joinedGeneralRooms.current.add(chatId);
            });
        };

        const handleConnect = () => {
            joinRooms();
        };

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

        const handleGeneralMessage = (message) => {
            if (!message?.chatId) return;
            if (message.userId === user.id) return;

            setUnreadByGeneral((prev) => ({
                ...prev,
                [message.chatId]: (prev[message.chatId] || 0) + 1,
            }));

            const chatName =
                generalChatNameMap.get(message.chatId) || 'Chat';
            toast(`${chatName}: nuevo mensaje`, {
                id: `general-chat-${message.id || message.chatId}`,
            });
        };

        socket.on('connect', handleConnect);
        socket.on('chat:message', handleMessage);
        socket.on('generalChat:message', handleGeneralMessage);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('chat:message', handleMessage);
            socket.off('generalChat:message', handleGeneralMessage);
            joinServiceIds.forEach((serviceId) => {
                if (!joinedServiceRooms.current.has(serviceId)) return;
                socket.emit('chat:leave', { serviceId });
                joinedServiceRooms.current.delete(serviceId);
            });
            joinGeneralChatIds.forEach((chatId) => {
                if (!joinedGeneralRooms.current.has(chatId)) return;
                socket.emit('generalChat:leave', { chatId });
                joinedGeneralRooms.current.delete(chatId);
            });
        };
    }, [
        socket,
        serviceIds,
        trackedServiceIds,
        generalChatIds,
        trackedGeneralChatIds,
        user,
        serviceNameMap,
        generalChatNameMap,
    ]);

    const resetServiceUnread = (serviceId) => {
        if (!serviceId) return;
        setUnreadByService((prev) => ({
            ...prev,
            [serviceId]: 0,
        }));
    };

    const resetGeneralUnread = (chatId) => {
        if (!chatId) return;
        setUnreadByGeneral((prev) => ({
            ...prev,
            [chatId]: 0,
        }));
    };

    const resetAllUnread = () => {
        setUnreadByService({});
        setUnreadByGeneral({});
    };

    const unreadTotal = useMemo(
        () =>
            Object.values(unreadByService).reduce(
                (sum, value) => sum + (value || 0),
                0
            ) +
            Object.values(unreadByGeneral).reduce(
                (sum, value) => sum + (value || 0),
                0
            ),
        [unreadByService, unreadByGeneral]
    );

    return (
        <ChatNotificationsContext.Provider
            value={{
                unreadByService,
                unreadByGeneral,
                unreadTotal,
                resetServiceUnread,
                resetGeneralUnread,
                resetAllUnread,
            }}
        >
            {children}
        </ChatNotificationsContext.Provider>
    );
};

export const useChatNotifications = () =>
    useContext(ChatNotificationsContext);
