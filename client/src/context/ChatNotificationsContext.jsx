import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
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
import {
    fetchAdminShiftSwapRequests,
    fetchMyShiftSwapRequests,
} from '../services/shiftSwapService.js';
import {
    fetchAdminEmployeeRequests,
    fetchMyEmployeeRequests,
} from '../services/employeeRequestService.js';
import { getChatSocket } from '../services/chatSocket.js';

const ChatNotificationsContext = createContext({
    unreadByService: {},
    unreadByGeneral: {},
    shiftSwapUnread: 0,
    employeeRequestUnread: 0,
    alertNotifications: [],
    alertUnreadTotal: 0,
    unreadTotal: 0,
    notificationTotal: 0,
    markNotificationRead: () => {},
    clearNotificationsBySection: () => {},
    markAllNotificationsRead: () => {},
    resetServiceUnread: () => {},
    resetGeneralUnread: () => {},
    resetAllUnread: () => {},
    resetChatUnread: () => {},
    resetShiftSwapUnread: () => {},
    resetEmployeeRequestUnread: () => {},
    setServiceChatActive: () => {},
    setGeneralChatActive: () => {},
    syncGeneralChats: () => {},
});

export const ChatNotificationsProvider = ({ children }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [services, setServices] = useState([]);
    const [unreadByService, setUnreadByService] = useState({});
    const [trackedServiceIds, setTrackedServiceIds] = useState([]);
    const [generalChats, setGeneralChats] = useState([]);
    const [unreadByGeneral, setUnreadByGeneral] = useState({});
    const [shiftSwapUnread, setShiftSwapUnread] = useState(0);
    const [employeeRequestUnread, setEmployeeRequestUnread] = useState(0);
    const [alertNotifications, setAlertNotifications] = useState([]);
    const [trackedGeneralChatIds, setTrackedGeneralChatIds] = useState([]);
    const joinedServiceRooms = useRef(new Set());
    const joinedGeneralRooms = useRef(new Set());
    const activeServiceChats = useRef(new Set());
    const activeGeneralChats = useRef(new Set());
    const storageKey = user?.id
        ? `syuso_chat_unread_${user.id}`
        : null;
    const generalStorageKey = user?.id
        ? `syuso_chat_unread_general_${user.id}`
        : null;
    const shiftSwapStorageKey = user?.id
        ? `syuso_shift_swap_unread_${user.id}`
        : null;
    const employeeRequestStorageKey = user?.id
        ? `syuso_employee_request_unread_${user.id}`
        : null;
    const alertStorageKey = user?.id
        ? `syuso_alert_notifications_${user.id}`
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

    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const buildAlertRoute = (section) => {
        const labels = {
            schedules: 'Mi cuenta > Cuadrantes',
            schedule: 'Mi cuenta > Mi cuadrante',
            shiftSwaps: 'Mi cuenta > Cambios de turno',
            employeeRequests: 'Mi cuenta > Peticiones',
            chats: 'Mi cuenta > Chats',
        };
        return labels[section] || 'Mi cuenta';
    };

    const addAlertNotification = useCallback((notification) => {
        if (!notification?.id) return;
        setAlertNotifications((prev) => {
            if (prev.some((item) => item.id === notification.id)) return prev;
            const next = [
                {
                    createdAt: new Date().toISOString(),
                    read: false,
                    ...notification,
                    routeLabel:
                        notification.routeLabel ||
                        buildAlertRoute(notification.section),
                },
                ...prev,
            ];
            return next.slice(0, 80);
        });
    }, []);

    useEffect(() => {
        if (!authToken || !user) {
            setServices([]);
            setUnreadByService({});
            setTrackedServiceIds([]);
            setGeneralChats([]);
            setUnreadByGeneral({});
            setShiftSwapUnread(0);
            setEmployeeRequestUnread(0);
            setAlertNotifications([]);
            setTrackedGeneralChatIds([]);
            return;
        }

        if (user.role === 'client') {
            setServices([]);
            setUnreadByService({});
            setGeneralChats([]);
            setUnreadByGeneral({});
            setShiftSwapUnread(0);
            setEmployeeRequestUnread(0);
            setAlertNotifications([]);
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
        if (!shiftSwapStorageKey) return;
        try {
            const raw = localStorage.getItem(shiftSwapStorageKey);
            if (!raw) return;
            setShiftSwapUnread(Number(raw) || 0);
        } catch {
            // ignore storage errors
        }
    }, [shiftSwapStorageKey]);

    useEffect(() => {
        if (!employeeRequestStorageKey) return;
        try {
            const raw = localStorage.getItem(employeeRequestStorageKey);
            if (!raw) return;
            setEmployeeRequestUnread(Number(raw) || 0);
        } catch {
            // ignore storage errors
        }
    }, [employeeRequestStorageKey]);

    useEffect(() => {
        if (!alertStorageKey) return;
        try {
            const raw = localStorage.getItem(alertStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setAlertNotifications(parsed);
            }
        } catch {
            // ignore storage errors
        }
    }, [alertStorageKey]);

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

        const loadShiftSwapUnread = async () => {
            try {
                const isAdmin =
                    user.role === 'admin' || user.role === 'sudo';
                const rows = isAdmin
                    ? await fetchAdminShiftSwapRequests(authToken)
                    : await fetchMyShiftSwapRequests(authToken);
                const list = Array.isArray(rows) ? rows : rows?.data || [];
                const actionable = list.filter((request) => {
                    if (isAdmin) {
                        return (
                            request.status === 'pending_counterpart' ||
                            request.status === 'pending_admin' ||
                            request.status === 'pending'
                        );
                    }
                    return (
                        request.status === 'pending_counterpart' &&
                        request.counterpartId === user.id
                    );
                }).length;
                setShiftSwapUnread(actionable);
            } catch {
                // ignore errors to avoid blocking
            }
        };

        loadShiftSwapUnread();
    }, [authToken, user]);

    useEffect(() => {
        if (!authToken || !user) return;
        if (user.role === 'client') return;

        const loadEmployeeRequestUnread = async () => {
            try {
                const isAdmin =
                    user.role === 'admin' || user.role === 'sudo';
                const rows = isAdmin
                    ? await fetchAdminEmployeeRequests(authToken)
                    : await fetchMyEmployeeRequests(authToken);
                const list = Array.isArray(rows) ? rows : rows?.data || [];
                const actionable = isAdmin
                    ? list.filter((request) => request.status === 'pending')
                          .length
                    : list.filter((request) => request.status === 'pending')
                          .length;
                setEmployeeRequestUnread(actionable);
            } catch {
                // ignore errors to avoid blocking
            }
        };

        loadEmployeeRequestUnread();
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
        if (!shiftSwapStorageKey) return;
        try {
            localStorage.setItem(
                shiftSwapStorageKey,
                String(shiftSwapUnread || 0)
            );
        } catch {
            // ignore storage errors
        }
    }, [shiftSwapStorageKey, shiftSwapUnread]);

    useEffect(() => {
        if (!employeeRequestStorageKey) return;
        try {
            localStorage.setItem(
                employeeRequestStorageKey,
                String(employeeRequestUnread || 0)
            );
        } catch {
            // ignore storage errors
        }
    }, [employeeRequestStorageKey, employeeRequestUnread]);

    useEffect(() => {
        if (!alertStorageKey) return;
        try {
            localStorage.setItem(
                alertStorageKey,
                JSON.stringify(alertNotifications || [])
            );
        } catch {
            // ignore storage errors
        }
    }, [alertStorageKey, alertNotifications]);

    useEffect(() => {
        if (!socket || !user) return;
        if (user.role === 'client') return;

        const joinServiceIds = [
            ...new Set([...serviceIds, ...trackedServiceIds]),
        ];

        const joinGeneralChatIds = [
            ...new Set([...generalChatIds, ...trackedGeneralChatIds]),
        ];

        const joinRooms = (force = false) => {
            joinServiceIds.forEach((serviceId) => {
                if (!force && joinedServiceRooms.current.has(serviceId)) return;
                socket.emit('chat:join', { serviceId });
                joinedServiceRooms.current.add(serviceId);
            });
            joinGeneralChatIds.forEach((chatId) => {
                if (!force && joinedGeneralRooms.current.has(chatId)) return;
                socket.emit('generalChat:join', { chatId });
                joinedGeneralRooms.current.add(chatId);
            });
        };

        joinRooms(false);

        const handleConnect = () => {
            joinRooms(true);
        };

        const handleMessage = (message) => {
            if (!message?.serviceId) return;
            if (message.userId === user.id) return;

            if (activeServiceChats.current.has(message.serviceId)) {
                setUnreadByService((prev) => ({
                    ...prev,
                    [message.serviceId]: 0,
                }));
                return;
            }

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

            if (activeGeneralChats.current.has(message.chatId)) {
                setUnreadByGeneral((prev) => ({
                    ...prev,
                    [message.chatId]: 0,
                }));
                return;
            }

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

        const handleShiftSwapEvent = (request) => {
            if (!request?.id) return;
            setShiftSwapUnread((prev) => (prev || 0) + 1);
            addAlertNotification({
                id: `shift-swap-${request.id}-${request.status || 'event'}`,
                type: 'shiftSwap',
                section: 'shiftSwaps',
                title: 'Cambio de turno',
                message:
                    request.serviceName ||
                    request.service ||
                    'Hay una actualización en cambios de turno.',
                routeLabel: buildAlertRoute('shiftSwaps'),
            });
            toast('Cambios de turno: nueva alerta', {
                id: `shift-swap-${request.id}-${request.status || 'event'}`,
            });
        };

        const handleEmployeeRequestEvent = (request) => {
            if (!request?.id) return;
            setEmployeeRequestUnread((prev) => (prev || 0) + 1);
            addAlertNotification({
                id: `employee-request-${request.id}-${request.status || 'event'}`,
                type: 'employeeRequest',
                section: 'employeeRequests',
                title: 'Petición',
                message:
                    request.serviceName ||
                    request.type ||
                    'Hay una actualización en peticiones.',
                routeLabel: buildAlertRoute('employeeRequests'),
            });
            toast('Peticiones: nueva alerta', {
                id: `employee-request-${request.id}-${request.status || 'event'}`,
            });
        };

        const handleServiceScheduleChanged = (event) => {
            if (!event?.serviceId) return;

            const serviceName =
                serviceNameMap.get(event.serviceId) || 'Servicio';
            const section = isAdminLike ? 'schedules' : 'schedule';
            addAlertNotification({
                id: `schedule-${event.serviceId}-${event.changedAt || Date.now()}`,
                type: 'schedule',
                section,
                title: 'Cuadrante actualizado',
                message: `${serviceName}: ${
                    event.message || 'cuadrante actualizado'
                }`,
                routeLabel: buildAlertRoute(section),
            });
            toast(`${serviceName}: cuadrante actualizado`, {
                id: `schedule-${event.serviceId}-${event.changedAt || Date.now()}`,
            });
        };

        socket.on('connect', handleConnect);
        socket.on('chat:message', handleMessage);
        socket.on('generalChat:message', handleGeneralMessage);
        socket.on('serviceSchedule:changed', handleServiceScheduleChanged);
        socket.on('shiftSwap:created', handleShiftSwapEvent);
        socket.on('shiftSwap:confirmed', handleShiftSwapEvent);
        socket.on('shiftSwap:approved', handleShiftSwapEvent);
        socket.on('shiftSwap:rejected', handleShiftSwapEvent);
        socket.on('employeeRequest:created', handleEmployeeRequestEvent);
        socket.on('employeeRequest:approved', handleEmployeeRequestEvent);
        socket.on('employeeRequest:rejected', handleEmployeeRequestEvent);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('chat:message', handleMessage);
            socket.off('generalChat:message', handleGeneralMessage);
            socket.off('serviceSchedule:changed', handleServiceScheduleChanged);
            socket.off('shiftSwap:created', handleShiftSwapEvent);
            socket.off('shiftSwap:confirmed', handleShiftSwapEvent);
            socket.off('shiftSwap:approved', handleShiftSwapEvent);
            socket.off('shiftSwap:rejected', handleShiftSwapEvent);
            socket.off('employeeRequest:created', handleEmployeeRequestEvent);
            socket.off('employeeRequest:approved', handleEmployeeRequestEvent);
            socket.off('employeeRequest:rejected', handleEmployeeRequestEvent);
        };
    }, [
        socket,
        serviceIds,
        trackedServiceIds,
        generalChatIds,
        trackedGeneralChatIds,
        user,
        isAdminLike,
        serviceNameMap,
        generalChatNameMap,
        addAlertNotification,
    ]);

    useEffect(() => {
        if (!socket) return;

        return () => {
            joinedServiceRooms.current.forEach((serviceId) => {
                socket.emit('chat:leave', { serviceId });
            });
            joinedServiceRooms.current.clear();

            joinedGeneralRooms.current.forEach((chatId) => {
                socket.emit('generalChat:leave', { chatId });
            });
            joinedGeneralRooms.current.clear();
        };
    }, [socket]);

    const resetServiceUnread = useCallback((serviceId) => {
        if (!serviceId) return;
        setUnreadByService((prev) => ({
            ...prev,
            [serviceId]: 0,
        }));
    }, []);

    const resetGeneralUnread = useCallback((chatId) => {
        if (!chatId) return;
        setUnreadByGeneral((prev) => ({
            ...prev,
            [chatId]: 0,
        }));
    }, []);

    const resetAllUnread = () => {
        setUnreadByService({});
        setUnreadByGeneral({});
        setShiftSwapUnread(0);
        setEmployeeRequestUnread(0);
        setAlertNotifications((prev) =>
            prev.map((item) => ({ ...item, read: true }))
        );
    };

    const resetChatUnread = useCallback(() => {
        const serviceIdsToRead = [
            ...new Set([
                ...serviceIds,
                ...trackedServiceIds,
                ...Object.keys(unreadByService || {}),
            ]),
        ];
        const generalChatIdsToRead = [
            ...new Set([
                ...generalChatIds,
                ...trackedGeneralChatIds,
                ...Object.keys(unreadByGeneral || {}),
            ]),
        ];

        serviceIdsToRead.forEach((serviceId) => {
            if (serviceId) {
                socket?.emit('chat:read', { serviceId });
            }
        });
        generalChatIdsToRead.forEach((chatId) => {
            if (chatId) {
                socket?.emit('generalChat:read', { chatId });
            }
        });

        setUnreadByService({});
        setUnreadByGeneral({});
    }, [
        socket,
        serviceIds,
        trackedServiceIds,
        unreadByService,
        generalChatIds,
        trackedGeneralChatIds,
        unreadByGeneral,
    ]);

    const resetShiftSwapUnread = () => {
        setShiftSwapUnread(0);
    };

    const resetEmployeeRequestUnread = () => {
        setEmployeeRequestUnread(0);
    };

    const markNotificationRead = useCallback((notificationId) => {
        if (!notificationId) return;
        setAlertNotifications((prev) =>
            prev.map((item) =>
                item.id === notificationId ? { ...item, read: true } : item
            )
        );
    }, []);

    const clearNotificationsBySection = useCallback((section) => {
        if (!section) return;
        setAlertNotifications((prev) =>
            prev.map((item) =>
                item.section === section ? { ...item, read: true } : item
            )
        );
    }, []);

    const markAllNotificationsRead = useCallback(() => {
        setAlertNotifications((prev) =>
            prev.map((item) => ({ ...item, read: true }))
        );
    }, []);

    const setServiceChatActive = useCallback((serviceId, active) => {
        if (!serviceId) return;
        if (active) {
            activeServiceChats.current.add(serviceId);
            resetServiceUnread(serviceId);
            return;
        }
        activeServiceChats.current.delete(serviceId);
    }, [resetServiceUnread]);

    const setGeneralChatActive = useCallback((chatId, active) => {
        if (!chatId) return;
        if (active) {
            activeGeneralChats.current.add(chatId);
            resetGeneralUnread(chatId);
            return;
        }
        activeGeneralChats.current.delete(chatId);
    }, [resetGeneralUnread]);

    const syncGeneralChats = (nextChats) => {
        if (!Array.isArray(nextChats)) return;
        setGeneralChats(nextChats);
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

    const alertUnreadTotal = useMemo(
        () =>
            alertNotifications.reduce(
                (sum, item) => sum + (item.read ? 0 : 1),
                0
            ),
        [alertNotifications]
    );

    const actionUnreadTotal =
        (shiftSwapUnread || 0) + (employeeRequestUnread || 0);
    const totalNotifications =
        unreadTotal + Math.max(alertUnreadTotal, actionUnreadTotal);

    return (
        <ChatNotificationsContext.Provider
            value={{
                unreadByService,
                unreadByGeneral,
                shiftSwapUnread,
                employeeRequestUnread,
                alertNotifications,
                alertUnreadTotal,
                unreadTotal,
                notificationTotal: totalNotifications,
                markNotificationRead,
                clearNotificationsBySection,
                markAllNotificationsRead,
                resetServiceUnread,
                resetGeneralUnread,
                resetAllUnread,
                resetChatUnread,
                resetShiftSwapUnread,
                resetEmployeeRequestUnread,
                setServiceChatActive,
                setGeneralChatActive,
                syncGeneralChats,
            }}
        >
            {children}
        </ChatNotificationsContext.Provider>
    );
};

export const useChatNotifications = () =>
    useContext(ChatNotificationsContext);
