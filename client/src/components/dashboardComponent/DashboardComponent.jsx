// src/components/DashboardComponent.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import useUser from '../../hooks/useUser.js';
import ProfileComponent from '../profileComponent/PorfileComponent';
import './DashboardComponent.css';
import AdminUsersSection from '../adminUsersSection/AminUsersSection.jsx';
import ContractsComponent from '../adminContractSetion/ContractComponent.jsx';
import ServicesComponent from '../adminServiceSection/ServiceComponent/ServiceComponent.jsx';
import ShiftComponent from '../adminShiftSection/ShiftComponent.jsx';
import WorkReportsComponent from '../adminWorkReportsSection/WorkReportsComponent.jsx';
import AdminCleanupSection from '../adminCleanupSection/AdminCleanupSection.jsx';
import AdminCvSection from '../adminCvSection/AdminCvSection.jsx';
import EmployeeServicesComponent from '../employeeServicesSection/EmployeeServicesComponent.jsx';
import ClientServicesComponent from '../clientServicesSection/ClientServicesComponent.jsx';
import ServiceChatDashboard from '../serviceChat/ServiceChatDashboard.jsx';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';

const DashboardComponent = () => {
    const { user } = useUser();
    const { unreadTotal } = useChatNotifications();
    const [activeSection, setActiveSection] = useState('profile');
    const hasSetDefault = useRef(false);

    const sections = useMemo(() => {
        if (!user) return [];

        const isAdminLike = user.role === 'admin' || user.role === 'sudo';

        if (isAdminLike) {
            const adminSections = [
                { id: 'contracts', label: 'Servicios' },
                { id: 'shifts', label: 'Turnos' },
                { id: 'chats', label: 'Chats' },
                { id: 'workReports', label: 'Partes de trabajo' },
                { id: 'users', label: 'Usuarios' },
                { id: 'services', label: 'Tipos de servicios' },
                { id: 'profile', label: 'Mi perfil' },
            ];
            if (user.role === 'sudo') {
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

        if (user.role === 'employee') {
            return [
                { id: 'services', label: 'Mis servicios' },
                { id: 'profile', label: 'Mi perfil' },
            ];
        }

        // client por defecto
        return [
            { id: 'profile', label: 'Mi perfil' },
            { id: 'contracts', label: 'Mis contratos' },
            { id: 'services', label: 'Servicios activos' },
        ];
    }, [user]);

    useEffect(() => {
        if (!sections.length) return;
        const currentExists = sections.some(
            (section) => section.id === activeSection
        );
        if (!hasSetDefault.current || !currentExists) {
            setActiveSection(sections[0].id);
            hasSetDefault.current = true;
        }
    }, [sections, activeSection]);

    const renderSectionContent = () => {
        if (!user) return null;

        switch (activeSection) {
            case 'profile':
                return <ProfileComponent />;

            case 'contracts':
                return <ContractsComponent />;

            case 'services':
                if (user.role === 'employee') {
                    return <EmployeeServicesComponent />;
                }
                if (user.role === 'client') {
                    return <ClientServicesComponent />;
                }
                return <ServicesComponent />;

            case 'shifts':
                return <ShiftComponent />;

            case 'users':
                return <AdminUsersSection />;

            case 'chats':
                return <ServiceChatDashboard />;
            case 'workReports':
                return <WorkReportsComponent />;
            case 'cleanup':
                return <AdminCleanupSection />;
            case 'cv':
                return <AdminCvSection />;

            default:
                return null;
        }
    };

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
                                {user.role === 'sudo'
                                    ? 'Superusuario'
                                    : user.role === 'admin'
                                      ? 'Administrador'
                                      : user.role === 'employee'
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
