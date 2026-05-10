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
                            ) : (
                                <button
                                    type='button'
                                    className='dashboard-alert-secondary'
                                    onClick={() => onRemove(notification.id)}
                                >
                                    Borrar
                                </button>
                            )}
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
        clearNotificationsBySection,
        clearReadNotifications,
        markAllNotificationsRead,
        resetShiftSwapUnread,
        resetEmployeeRequestUnread,
    } =
        useChatNotifications();
    const [activeSection, setActiveSection] = useState('profile');
    const hasSetDefault = useRef(false);
    const userRole = String(user?.role || '').trim().toLowerCase();
    const isAdminLike = userRole === 'admin' || userRole === 'sudo';
    const isEmployeeLike = userRole === 'employee' || userRole === 'empleado';
    const isClient = userRole === 'client';

    const sections = useMemo(() => {
        if (!user) return [];

        if (isAdminLike) {
            const adminSections = [
                { id: 'contracts', label: 'Servicios' },
                { id: 'schedules', label: 'Cuadrantes' },
                { id: 'shifts', label: 'Turnos' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'workReports', label: 'Partes de trabajo' },
                { id: 'users', label: 'Usuarios' },
                { id: 'profile', label: 'Mi perfil' },
            ];
            if (userRole === 'sudo') {
                adminSections.splice(
                    adminSections.length - 1,
                    0,
                    { id: 'cleanup', label: 'Limpieza' }
                );
                adminSections.splice(
                    adminSections.length - 1,
                    0,
                    { id: 'cv', label: 'CV' }
                );
            }
            return adminSections;
        }

        if (isEmployeeLike) {
            return [
                { id: 'services', label: 'Mis servicios' },
                { id: 'schedule', label: 'Mi cuadrante' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'profile', label: 'Mi perfil' },
            ];
        }

        if (!isClient) {
            return [
                { id: 'services', label: 'Mis servicios' },
                { id: 'schedule', label: 'Mi cuadrante' },
                { id: 'shiftSwaps', label: 'Cambios de turno' },
                { id: 'employeeRequests', label: 'Peticiones' },
                { id: 'chats', label: 'Chats' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'profile', label: 'Mi perfil' },
            ];
        }

        return [
            { id: 'profile', label: 'Mi perfil' },
            { id: 'contracts', label: 'Mis contratos' },
            { id: 'services', label: 'Servicios activos' },
        ];
    }, [isAdminLike, isClient, isEmployeeLike, user, userRole]);

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
            clearNotificationsBySection('shiftSwaps');
        }
        if (activeSection === 'employeeRequests') {
            resetEmployeeRequestUnread();
            clearNotificationsBySection('employeeRequests');
        }
        if (activeSection === 'schedules') {
            clearNotificationsBySection('schedules');
        }
        if (activeSection === 'schedule') {
            clearNotificationsBySection('schedule');
        }
        if (activeSection === 'chats') {
            clearNotificationsBySection('chats');
        }
    }, [
        activeSection,
        clearNotificationsBySection,
        resetEmployeeRequestUnread,
        resetShiftSwapUnread,
    ]);

    const renderSectionContent = () => {
        if (!user) return null;

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
                        {sections.map((section) => (
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
                                {section.id === 'alerts' &&
                                alertUnreadTotal > 0 ? (
                                    <span className='dashboard-nav-badge'>
                                        {alertUnreadTotal}
                                    </span>
                                ) : null}
                                {section.id === 'shiftSwaps' &&
                                shiftSwapUnread > 0 ? (
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
                        ))}
                    </nav>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className='dashboard-main'>{renderSectionContent()}</main>
            </div>
        </div>
    );
};

export default DashboardComponent;
