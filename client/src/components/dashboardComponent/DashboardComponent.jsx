// src/components/DashboardComponent.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBriefcase,
    FaBuilding,
    FaComments,
    FaLayerGroup,
    FaUser,
} from 'react-icons/fa';
import useUser from '../../hooks/useUser.js';
import ProfileComponent from '../profileComponent/PorfileComponent';
import './DashboardComponent.css';
import AdminUsersSection from '../adminUsersSection/AminUsersSection.jsx';
import ContractsComponent from '../adminContractSetion/ContractComponent.jsx';
import ServicesComponent from '../adminServiceSection/ServiceComponent/ServiceComponent.jsx';
import ScheduleComponent from '../adminScheduleSection/ScheduleComponent.jsx';
import ShiftComponent from '../adminShiftSection/ShiftComponent.jsx';
import WorkReportsComponent from '../adminWorkReportsSection/WorkReportsComponent.jsx';
import AdminCleanupSection from '../adminCleanupSection/AdminCleanupSection.jsx';
import AdminCvSection from '../adminCvSection/AdminCvSection.jsx';
import ShiftSwapsComponent from '../shiftSwaps/ShiftSwapsComponent.jsx';
import EmployeeRequestsComponent from '../employeeRequests/EmployeeRequestsComponent.jsx';
import EmployeeServicesComponent from '../employeeServicesSection/EmployeeServicesComponent.jsx';
import ClientServicesComponent from '../clientServicesSection/ClientServicesComponent.jsx';
import ChatHub from '../chatHub/ChatHub.jsx';
import EmployeeScheduleComponent from '../employeeSchedule/EmployeeScheduleComponent.jsx';
import EmployeeDocumentationComponent from '../employeeDocumentation/EmployeeDocumentationComponent.jsx';
import AdminWarehouseSection from '../adminWarehouseSection/AdminWarehouseSection.jsx';
import PayrollsComponent from '../payrolls/PayrollsComponent.jsx';
import BillingComponent from '../billing/BillingComponent.jsx';
import AdminVehiclesSection from '../adminVehiclesSection/AdminVehiclesSection.jsx';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';

const formatAlertDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const parseDashboardPermissions = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const operativeSectionIds = [
    'contracts',
    'schedules',
    'shifts',
    'shiftSwaps',
    'employeeRequests',
    'workReports',
];

const administrationSectionIds = [
    'documentations',
    'warehouse',
    'vehicles',
    'payrolls',
    'billing',
];
const communicationSectionIds = ['chats', 'alerts'];

const getDashboardRoleLabel = ({
    userRole,
    isAdminLike,
    isEmployeeLike,
    isClient,
}) => {
    if (userRole === 'sudo') return 'Superusuario';
    if (userRole === 'admin') return 'Administrador';
    if (isClient) return 'Cliente';
    if (isEmployeeLike || !isAdminLike) return 'Empleado';
    return 'Empleado';
};

const AlertsPanel = ({
    notifications,
    onOpenSection,
    onMarkRead,
    onRemove,
    onMarkAllRead,
    onClearRead,
}) => (
    <section className='dashboard-alerts'>
        <div className='dashboard-alerts-header'>
            <div>
                <h2>Alertas</h2>
                <p>
                    Revisa avisos de chats, cuadrantes, cambios de turno y peticiones.
                </p>
            </div>
            <div className='dashboard-alerts-header-actions'>
                <button
                    type='button'
                    className='dashboard-alerts-clear'
                    onClick={onMarkAllRead}
                    disabled={!notifications.some((item) => !item.read)}
                >
                    Marcar todo como leido
                </button>
                <button
                    type='button'
                    className='dashboard-alerts-clear'
                    onClick={onClearRead}
                    disabled={!notifications.some((item) => item.read)}
                >
                    Borrar leidas
                </button>
            </div>
        </div>

        {notifications.length ? (
            <div className='dashboard-alerts-list'>
                {notifications.map((notification) => (
                    <article
                        key={notification.id}
                        className={
                            'dashboard-alert-card' +
                            (!notification.read
                                ? ' dashboard-alert-card--unread'
                                : '')
                        }
                    >
                        <div className='dashboard-alert-card-main'>
                            <div>
                                <h3>{notification.title}</h3>
                                <p>{notification.message}</p>
                            </div>
                            <span>{formatAlertDate(notification.createdAt)}</span>
                        </div>
                        <div className='dashboard-alert-route'>
                            Recorrido: {notification.routeLabel}
                        </div>
                        <div className='dashboard-alert-actions'>
                            <button
                                type='button'
                                onClick={() => {
                                    onMarkRead(notification.id);
                                    onOpenSection(
                                        notification.section,
                                        notification
                                    );
                                }}
                            >
                                Ver cambio
                            </button>
                            {!notification.read ? (
                                <button
                                    type='button'
                                    className='dashboard-alert-secondary'
                                    onClick={() => onMarkRead(notification.id)}
                                >
                                    Marcar leida
                                </button>
                            ) : null}
                            <button
                                type='button'
                                className='dashboard-alert-secondary'
                                onClick={() => onRemove(notification.id)}
                            >
                                Borrar
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        ) : (
            <div className='dashboard-alerts-empty'>
                <p>No tienes alertas pendientes.</p>
            </div>
        )}
    </section>
);

const DashboardComponent = () => {
    const { user, isLoadingUser } = useUser();
    const {
        unreadTotal,
        shiftSwapUnread,
        employeeRequestUnread,
        alertNotifications,
        alertUnreadTotal,
        markNotificationRead,
        removeNotification,
        clearReadNotifications,
        markAllNotificationsRead,
        resetShiftSwapUnread,
        resetEmployeeRequestUnread,
    } =
        useChatNotifications();
    const [activeSection, setActiveSection] = useState('profile');
    const [documentationFocusEmployeeId, setDocumentationFocusEmployeeId] =
        useState('');
    const [chatFocusGeneralChatId, setChatFocusGeneralChatId] = useState('');
    const [isOperativeOpen, setIsOperativeOpen] = useState(true);
    const [isAdministrationOpen, setIsAdministrationOpen] = useState(true);
    const [isCommunicationOpen, setIsCommunicationOpen] = useState(true);
    const [isManagementOpen, setIsManagementOpen] = useState(true);
    const [activeMobileGroup, setActiveMobileGroup] = useState('');
    const hasSetDefault = useRef(false);
    const userRole = String(user?.role || '').trim().toLowerCase();
    const isAdminLike = userRole === 'admin' || userRole === 'sudo';
    const isEmployeeLike = userRole === 'employee' || userRole === 'empleado';
    const isClient = userRole === 'client';
    const allowedDashboardSections = useMemo(() => {
        if (!user || userRole === 'sudo') return null;
        const permissions = parseDashboardPermissions(user.dashboardPermissions);
        if (permissions === null) return null;
        return new Set([...permissions, 'profile']);
    }, [user, userRole]);

    const sections = useMemo(() => {
        if (!user) return [];

        let roleSections;

        if (isAdminLike) {
            roleSections = [
                { id: 'contracts', label: 'Servicios' },
                { id: 'schedules', label: 'Cuadrantes' },
                { id: 'shifts', label: 'Turnos' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'workReports', label: 'Partes de trabajo' },
                { id: 'documentations', label: 'Documentacion' },
                { id: 'warehouse', label: 'Almacen' },
                { id: 'vehicles', label: 'Vehiculos' },
                { id: 'payrolls', label: 'Nominas' },
                { id: 'billing', label: 'Facturacion' },
                { id: 'users', label: 'Usuarios' },
                { id: 'profile', label: 'Mi perfil' },
            ];
            if (
                userRole === 'sudo' ||
                allowedDashboardSections?.has('cleanup')
            ) {
                roleSections.splice(
                    roleSections.length - 1,
                    0,
                    { id: 'cleanup', label: 'Limpieza' }
                );
            }
            if (userRole === 'sudo' || allowedDashboardSections?.has('cv')) {
                roleSections.splice(
                    roleSections.length - 1,
                    0,
                    { id: 'cv', label: 'CV' }
                );
            }
        } else if (isEmployeeLike) {
            roleSections = [
                { id: 'services', label: 'Mis servicios' },
                { id: 'schedule', label: 'Mi cuadrante' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
                { id: 'documentations', label: 'Mi documentacion' },
                { id: 'payrolls', label: 'Mis nominas' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'profile', label: 'Mi perfil' },
            ];
        } else if (!isClient) {
            roleSections = [
                { id: 'services', label: 'Mis servicios' },
                { id: 'schedule', label: 'Mi cuadrante' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
               { id: 'documentations', label: 'Mi documentacion' },
                { id: 'payrolls', label: 'Mis nominas' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'profile', label: 'Mi perfil' },
            ];
        } else {
            roleSections = [
                { id: 'profile', label: 'Mi perfil' },
                { id: 'contracts', label: 'Mis contratos' },
                { id: 'services', label: 'Servicios activos' },
            ];
        }

        if (!allowedDashboardSections) return roleSections;

        return roleSections.filter((section) =>
            allowedDashboardSections.has(section.id)
        );
    }, [
        allowedDashboardSections,
        isAdminLike,
        isClient,
        isEmployeeLike,
        user,
        userRole,
    ]);

    useEffect(() => {
        if (!sections.length) return;
        const storedSection =
            typeof window !== 'undefined'
                ? sessionStorage.getItem('syuso_dashboard_section')
                : null;
        const currentExists = sections.some(
            (section) => section.id === activeSection
        );
        const storedExists = storedSection
            ? sections.some((section) => section.id === storedSection)
            : false;

        if (!hasSetDefault.current) {
            setActiveSection(
                storedExists ? storedSection : sections[0].id
            );
            hasSetDefault.current = true;
            return;
        }

        if (!currentExists) {
            setActiveSection(sections[0].id);
        }
    }, [sections, activeSection]);

    useEffect(() => {
        if (!sections.length || !activeSection) return;
        if (typeof window === 'undefined') return;
        const exists = sections.some(
            (section) => section.id === activeSection
        );
        if (exists) {
            sessionStorage.setItem(
                'syuso_dashboard_section',
                activeSection
            );
        }
    }, [sections, activeSection]);

    useEffect(() => {
        if (activeSection === 'shiftSwaps') {
            resetShiftSwapUnread();
        }
        if (activeSection === 'employeeRequests') {
            resetEmployeeRequestUnread();
        }
    }, [
        activeSection,
        resetEmployeeRequestUnread,
        resetShiftSwapUnread,
    ]);

    const operativeSections = useMemo(
        () =>
            isAdminLike
                ? sections.filter((section) =>
                      operativeSectionIds.includes(section.id)
                  )
                : [],
        [isAdminLike, sections]
    );

    const topLevelSections = useMemo(
        () =>
            isAdminLike
                ? sections.filter(
                      (section) =>
                          !operativeSectionIds.includes(section.id) &&
                          !administrationSectionIds.includes(section.id) &&
                          !communicationSectionIds.includes(section.id)
                  )
                : sections,
        [isAdminLike, sections]
    );

    const administrationSections = useMemo(
        () =>
            isAdminLike
                ? sections.filter((section) =>
                      administrationSectionIds.includes(section.id)
                  )
                : [],
        [isAdminLike, sections]
    );

    const communicationSections = useMemo(
        () =>
            isAdminLike
                ? sections.filter((section) =>
                      communicationSectionIds.includes(section.id)
                  )
                : [],
        [isAdminLike, sections]
    );

    const managementSections = useMemo(
        () => (isAdminLike ? topLevelSections : []),
        [isAdminLike, topLevelSections]
    );

    const operativeUnreadTotal =
        operativeSections.some((section) => section.id === 'shiftSwaps')
            ? shiftSwapUnread
            : 0;
    const operativeRequestUnread =
        operativeSections.some((section) => section.id === 'employeeRequests')
            ? employeeRequestUnread
            : 0;
    const operativeBadgeTotal = operativeUnreadTotal + operativeRequestUnread;
    const documentationUnread = useMemo(
        () =>
            alertNotifications.reduce((sum, item) => {
                if (item.read || item.section !== 'documentations') return sum;
                return sum + 1;
            }, 0),
        [alertNotifications]
    );
    const administrationBadgeTotal =
        administrationSections.some((section) => section.id === 'documentations')
            ? documentationUnread
            : 0;
    const communicationBadgeTotal =
        (communicationSections.some((section) => section.id === 'chats')
            ? unreadTotal
            : 0) +
        (communicationSections.some((section) => section.id === 'alerts')
            ? alertUnreadTotal
            : 0);

    const getSectionBadge = (sectionId) => {
        if (sectionId === 'chats') return unreadTotal;
        if (sectionId === 'alerts') return alertUnreadTotal;
        if (sectionId === 'shiftSwaps') return shiftSwapUnread;
        if (sectionId === 'employeeRequests') return employeeRequestUnread;
        if (sectionId === 'documentations') return documentationUnread;
        return 0;
    };

    const getGroupBadge = (group) =>
        group.sections.reduce(
            (sum, section) => sum + getSectionBadge(section.id),
            0
        );

    const mobileGroups = useMemo(() => {
        if (!sections.length) return [];

        const byIds = (ids) =>
            sections.filter((section) => ids.includes(section.id));

        const buildGroup = ({ id, label, icon, ids }) => ({
            id,
            label,
            icon,
            sections: byIds(ids),
        });

        if (isAdminLike) {
            return [
                {
                    id: 'operative',
                    label: 'Operativa',
                    icon: FaBriefcase,
                    sections: operativeSections,
                },
                {
                    id: 'administration',
                    label: 'Admin.',
                    icon: FaBuilding,
                    sections: administrationSections,
                },
                {
                    id: 'communication',
                    label: 'Comunica.',
                    icon: FaComments,
                    sections: communicationSections,
                },
                {
                    id: 'management',
                    label: 'Gestion',
                    icon: FaLayerGroup,
                    sections: managementSections,
                },
            ].filter((group) => group.sections.length);
        }

        const groups = [
            buildGroup({
                id: 'operative',
                label: 'Operativa',
                icon: FaBriefcase,
                ids: ['services', 'contracts', 'schedule', 'shiftSwaps', 'employeeRequests'],
            }),
            buildGroup({
                id: 'administration',
                label: 'Docs',
                icon: FaBuilding,
                ids: ['documentations', 'payrolls'],
            }),
            buildGroup({
                id: 'communication',
                label: 'Comunic.',
                icon: FaComments,
                ids: ['chats', 'alerts'],
            }),
            buildGroup({
                id: 'profile',
                label: 'Perfil',
                icon: FaUser,
                ids: ['profile'],
            }),
        ].filter((group) => group.sections.length);

        const includedIds = new Set(
            groups.flatMap((group) => group.sections.map((section) => section.id))
        );
        const remaining = sections.filter((section) => !includedIds.has(section.id));
        if (remaining.length) {
            groups.splice(Math.max(groups.length - 1, 0), 0, {
                id: 'more',
                label: 'Mas',
                icon: FaLayerGroup,
                sections: remaining,
            });
        }

        return groups.slice(0, 4);
    }, [
        administrationSections,
        communicationSections,
        isAdminLike,
        managementSections,
        operativeSections,
        sections,
    ]);

    useEffect(() => {
        setActiveMobileGroup('');
    }, [activeSection]);

    useEffect(() => {
        if (operativeSectionIds.includes(activeSection)) {
            setIsOperativeOpen(true);
        }
        if (administrationSectionIds.includes(activeSection)) {
            setIsAdministrationOpen(true);
        }
        if (communicationSectionIds.includes(activeSection)) {
            setIsCommunicationOpen(true);
        }
        if (
            isAdminLike &&
            !operativeSectionIds.includes(activeSection) &&
            !administrationSectionIds.includes(activeSection) &&
            !communicationSectionIds.includes(activeSection)
        ) {
            setIsManagementOpen(true);
        }
    }, [activeSection, isAdminLike]);

    const renderNavItem = (section) => (
        <button
            key={section.id}
            type='button'
            className={
                'dashboard-navitem' +
                (activeSection === section.id
                    ? ' dashboard-navitem--active'
                    : '')
            }
            onClick={() => setActiveSection(section.id)}
        >
            <span className='dashboard-navitem-label'>
                {section.label}
            </span>
            {getSectionBadge(section.id) > 0 ? (
                <span className='dashboard-nav-badge'>
                    {getSectionBadge(section.id)}
                </span>
            ) : null}
        </button>
    );

    const renderMobileDashboardNav = () => {
        if (!mobileGroups.length) return null;
        const selectedGroup = mobileGroups.find(
            (group) => group.id === activeMobileGroup
        );

        return (
            <div className='dashboard-mobile-nav-shell'>
                {selectedGroup ? (
                    <div className='dashboard-mobile-sheet'>
                        <div className='dashboard-mobile-sheet-handle' />
                        <div className='dashboard-mobile-sheet-title'>
                            {selectedGroup.label}
                        </div>
                        <div className='dashboard-mobile-sheet-list'>
                            {selectedGroup.sections.map((section) => (
                                <button
                                    key={section.id}
                                    type='button'
                                    className={
                                        'dashboard-mobile-sheet-item' +
                                        (activeSection === section.id
                                            ? ' dashboard-mobile-sheet-item--active'
                                            : '')
                                    }
                                    onClick={() => setActiveSection(section.id)}
                                >
                                    <span>{section.label}</span>
                                    {getSectionBadge(section.id) > 0 ? (
                                        <span className='dashboard-nav-badge'>
                                            {getSectionBadge(section.id)}
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
                <nav className='dashboard-mobile-nav' aria-label='Menu movil'>
                    {mobileGroups.map((group) => {
                        const Icon = group.icon || FaLayerGroup;
                        const isActiveGroup = group.sections.some(
                            (section) => section.id === activeSection
                        );
                        const badge = getGroupBadge(group);
                        return (
                            <button
                                key={group.id}
                                type='button'
                                className={
                                    'dashboard-mobile-nav-button' +
                                    (isActiveGroup
                                        ? ' dashboard-mobile-nav-button--active'
                                        : '')
                                }
                                onClick={() =>
                                    setActiveMobileGroup((prev) =>
                                        prev === group.id ? '' : group.id
                                    )
                                }
                            >
                                <Icon aria-hidden='true' />
                                <span>{group.label}</span>
                                {badge > 0 ? (
                                    <span className='dashboard-mobile-nav-badge'>
                                        {badge}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </nav>
            </div>
        );
    };

    const renderSectionContent = () => {
        if (!user) return null;
        if (!sections.some((section) => section.id === activeSection)) {
            return null;
        }

        switch (activeSection) {
            case 'alerts':
                return (
                    <AlertsPanel
                        notifications={alertNotifications}
                        onOpenSection={(section, notification) => {
                            if (
                                section &&
                                sections.some((item) => item.id === section)
                            ) {
                                if (
                                    section === 'documentations' &&
                                    notification?.employeeId
                                ) {
                                    setDocumentationFocusEmployeeId(
                                        notification.employeeId
                                    );
                                }
                                if (section === 'chats' && notification?.chatId) {
                                    setChatFocusGeneralChatId(notification.chatId);
                                }
                                setActiveSection(section);
                            }
                        }}
                        onMarkRead={markNotificationRead}
                        onRemove={removeNotification}
                        onMarkAllRead={markAllNotificationsRead}
                        onClearRead={clearReadNotifications}
                    />
                );

            case 'profile':
                return <ProfileComponent />;

            case 'contracts':
                return <ContractsComponent />;

            case 'services':
                if (isEmployeeLike || (!isAdminLike && !isClient)) {
                    return <EmployeeServicesComponent />;
                }
                if (isClient) {
                    return <ClientServicesComponent />;
                }
                return <ServicesComponent />;

            case 'shifts':
                return <ShiftComponent />;
            case 'schedules':
                return <ScheduleComponent />;

            case 'users':
                return <AdminUsersSection />;

            case 'chats':
                return (
                    <ChatHub focusGeneralChatId={chatFocusGeneralChatId} />
                );
            case 'schedule':
                return <EmployeeScheduleComponent />;
            case 'workReports':
                return <WorkReportsComponent />;
            case 'cleanup':
                return <AdminCleanupSection />;
            case 'cv':
                return <AdminCvSection />;
            case 'shiftSwaps':
                return <ShiftSwapsComponent />;
            case 'employeeRequests':
                return <EmployeeRequestsComponent />;
            case 'documentations':
                return (
                    <EmployeeDocumentationComponent
                        focusEmployeeId={documentationFocusEmployeeId}
                    />
                );
            case 'warehouse':
                return <AdminWarehouseSection />;
            case 'vehicles':
                return <AdminVehiclesSection />;
            case 'payrolls':
                return <PayrollsComponent />;
            case 'billing':
                return <BillingComponent />;

            default:
                return null;
        }
    };

    if (isLoadingUser) {
        return (
            <div className='dashboard-wrapper'>
                <div className='dashboard-empty'>
                    <p>Cargando tu sesión...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className='dashboard-wrapper'>
                <div className='dashboard-empty'>
                    <p>Debes iniciar sesión para acceder a tu panel.</p>
                </div>
            </div>
        );
    }

    const isWideDashboardView = isAdminLike;

    return (
        <div
            className={
                'dashboard-wrapper' +
                (isWideDashboardView ? ' dashboard-wrapper--map-view' : '')
            }
        >
            <div className='dashboard-container'>
                {/* SIDEBAR */}
                <aside className='dashboard-sidebar'>
                    <div className='dashboard-userbox'>
                        <div className='dashboard-avatar'>
                            {user.firstName?.[0]?.toUpperCase() ||
                                user.email?.[0]?.toUpperCase() ||
                                'U'}
                        </div>
                        <div className='dashboard-userinfo'>
                            <p className='dashboard-username'>
                                {user.firstName} {user.lastName}
                            </p>
                            <p className='dashboard-userrole'>
                                {getDashboardRoleLabel({
                                    userRole,
                                    isAdminLike,
                                    isEmployeeLike,
                                    isClient,
                                })}
                            </p>
                        </div>
                    </div>

                    <nav className='dashboard-nav'>
                        {isAdminLike && operativeSections.length > 0 ? (
                            <div className='dashboard-navgroup'>
                                <button
                                    type='button'
                                    className={
                                        'dashboard-navitem dashboard-navgroup-toggle' +
                                        (operativeSectionIds.includes(
                                            activeSection
                                        )
                                            ? ' dashboard-navitem--active'
                                            : '')
                                    }
                                    onClick={() =>
                                        setIsOperativeOpen((prev) => !prev)
                                    }
                                    aria-expanded={isOperativeOpen}
                                >
                                    <span className='dashboard-navitem-label'>
                                        Operativa
                                    </span>
                                    <span className='dashboard-navgroup-meta'>
                                        {operativeBadgeTotal > 0 ? (
                                            <span className='dashboard-nav-badge'>
                                                {operativeBadgeTotal}
                                            </span>
                                        ) : null}
                                        <span className='dashboard-nav-chevron'>
                                            {isOperativeOpen ? '-' : '+'}
                                        </span>
                                    </span>
                                </button>
                                {isOperativeOpen ? (
                                    <div className='dashboard-navsub'>
                                        {operativeSections.map(renderNavItem)}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {isAdminLike && administrationSections.length > 0 ? (
                            <div className='dashboard-navgroup'>
                                <button
                                    type='button'
                                    className={
                                        'dashboard-navitem dashboard-navgroup-toggle' +
                                        (administrationSectionIds.includes(
                                            activeSection
                                        )
                                            ? ' dashboard-navitem--active'
                                            : '')
                                    }
                                    onClick={() =>
                                        setIsAdministrationOpen((prev) => !prev)
                                    }
                                    aria-expanded={isAdministrationOpen}
                                >
                                    <span className='dashboard-navitem-label'>
                                        Administracion
                                    </span>
                                    <span className='dashboard-navgroup-meta'>
                                        {administrationBadgeTotal > 0 ? (
                                            <span className='dashboard-nav-badge'>
                                                {administrationBadgeTotal}
                                            </span>
                                        ) : null}
                                        <span className='dashboard-nav-chevron'>
                                            {isAdministrationOpen ? '-' : '+'}
                                        </span>
                                    </span>
                                </button>
                                {isAdministrationOpen ? (
                                    <div className='dashboard-navsub'>
                                        {administrationSections.map(renderNavItem)}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {isAdminLike && communicationSections.length > 0 ? (
                            <div className='dashboard-navgroup'>
                                <button
                                    type='button'
                                    className={
                                        'dashboard-navitem dashboard-navgroup-toggle' +
                                        (communicationSectionIds.includes(
                                            activeSection
                                        )
                                            ? ' dashboard-navitem--active'
                                            : '')
                                    }
                                    onClick={() =>
                                        setIsCommunicationOpen((prev) => !prev)
                                    }
                                    aria-expanded={isCommunicationOpen}
                                >
                                    <span className='dashboard-navitem-label'>
                                        Comunicacion
                                    </span>
                                    <span className='dashboard-navgroup-meta'>
                                        {communicationBadgeTotal > 0 ? (
                                            <span className='dashboard-nav-badge'>
                                                {communicationBadgeTotal}
                                            </span>
                                        ) : null}
                                        <span className='dashboard-nav-chevron'>
                                            {isCommunicationOpen ? '-' : '+'}
                                        </span>
                                    </span>
                                </button>
                                {isCommunicationOpen ? (
                                    <div className='dashboard-navsub'>
                                        {communicationSections.map(renderNavItem)}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {isAdminLike && managementSections.length > 0 ? (
                            <div className='dashboard-navgroup'>
                                <button
                                    type='button'
                                    className={
                                        'dashboard-navitem dashboard-navgroup-toggle' +
                                        (managementSections.some(
                                            (section) =>
                                                section.id === activeSection
                                        )
                                            ? ' dashboard-navitem--active'
                                            : '')
                                    }
                                    onClick={() =>
                                        setIsManagementOpen((prev) => !prev)
                                    }
                                    aria-expanded={isManagementOpen}
                                >
                                    <span className='dashboard-navitem-label'>
                                        Gestion
                                    </span>
                                    <span className='dashboard-navgroup-meta'>
                                        <span className='dashboard-nav-chevron'>
                                            {isManagementOpen ? '-' : '+'}
                                        </span>
                                    </span>
                                </button>
                                {isManagementOpen ? (
                                    <div className='dashboard-navsub'>
                                        {managementSections.map(renderNavItem)}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {!isAdminLike ? topLevelSections.map(renderNavItem) : null}
                    </nav>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className='dashboard-main'>{renderSectionContent()}</main>
            </div>
            {renderMobileDashboardNav()}
        </div>
    );
};

export default DashboardComponent;
