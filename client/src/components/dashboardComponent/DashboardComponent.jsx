// src/components/DashboardComponent.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
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

const administrationSectionIds = ['documentations'];

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
                                    onOpenSection(notification.section);
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
    const [isOperativeOpen, setIsOperativeOpen] = useState(true);
    const [isAdministrationOpen, setIsAdministrationOpen] = useState(true);
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
                { id: 'users', label: 'Usuarios' },
                { id: 'profile', label: 'Mi perfil' },
            ];
            if (userRole === 'sudo') {
                roleSections.splice(
                    roleSections.length - 1,
                    0,
                    { id: 'cleanup', label: 'Limpieza' }
                );
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
                          !administrationSectionIds.includes(section.id)
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

    const operativeUnreadTotal =
        operativeSections.some((section) => section.id === 'shiftSwaps')
            ? shiftSwapUnread
            : 0;
    const operativeRequestUnread =
        operativeSections.some((section) => section.id === 'employeeRequests')
            ? employeeRequestUnread
            : 0;
    const operativeBadgeTotal = operativeUnreadTotal + operativeRequestUnread;

    useEffect(() => {
        if (operativeSectionIds.includes(activeSection)) {
            setIsOperativeOpen(true);
        }
        if (administrationSectionIds.includes(activeSection)) {
            setIsAdministrationOpen(true);
        }
    }, [activeSection]);

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
            {section.id === 'chats' && unreadTotal > 0 ? (
                <span className='dashboard-nav-badge'>
                    {unreadTotal}
                </span>
            ) : null}
            {section.id === 'alerts' && alertUnreadTotal > 0 ? (
                <span className='dashboard-nav-badge'>
                    {alertUnreadTotal}
                </span>
            ) : null}
            {section.id === 'shiftSwaps' && shiftSwapUnread > 0 ? (
                <span className='dashboard-nav-badge'>
                    {shiftSwapUnread}
                </span>
            ) : null}
            {section.id === 'employeeRequests' &&
            employeeRequestUnread > 0 ? (
                <span className='dashboard-nav-badge'>
                    {employeeRequestUnread}
                </span>
            ) : null}
        </button>
    );

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
                        onOpenSection={(section) => {
                            if (
                                section &&
                                sections.some((item) => item.id === section)
                            ) {
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
                return <ChatHub />;
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
                return <EmployeeDocumentationComponent />;

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

    return (
        <div className='dashboard-wrapper'>
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
                                {userRole === 'sudo'
                                    ? 'Superusuario'
                                    : userRole === 'admin'
                                      ? 'Administrador'
                                      : isEmployeeLike ||
                                          (!isAdminLike && !isClient)
                                        ? 'Empleado'
                                        : 'Cliente'}
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
                        {topLevelSections.map(renderNavItem)}
                    </nav>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className='dashboard-main'>{renderSectionContent()}</main>
            </div>
        </div>
    );
};

export default DashboardComponent;
