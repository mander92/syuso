// src/components/DashboardComponent.jsx
import { useState, useMemo } from 'react';
import useUser from '../../hooks/useUser.js';
import ProfileComponent from '../profileComponent/PorfileComponent';
import './DashboardComponent.css';
import AdminUsersSection from '../adminUsersSection/AminUsersSection.jsx';
import ContractsComponent from '../adminContractSetion/ContractComponent.jsx';
import ServicesComponent from '../adminServiceSection/ServiceComponent/ServiceComponent.jsx';
import ShiftComponent from '../adminShiftSection/ShiftComponent.jsx';
import EmployeeServicesComponent from '../employeeServicesSection/EmployeeServicesComponent.jsx';
import ClientServicesComponent from '../clientServicesSection/ClientServicesComponent.jsx';
import ServiceChatDashboard from '../serviceChat/ServiceChatDashboard.jsx';

const DashboardComponent = () => {
    const { user } = useUser();
    const [activeSection, setActiveSection] = useState('profile');

    const sections = useMemo(() => {
        if (!user) return [];

        const isAdminLike = user.role === 'admin' || user.role === 'sudo';

        if (isAdminLike) {
            return [
                { id: 'profile', label: 'Mi perfil' },
                { id: 'contracts', label: 'Contratos' },
                { id: 'services', label: 'Servicios' },
                { id: 'chats', label: 'Chats' },
                { id: 'shifts', label: 'Turnos' },
                { id: 'users', label: 'Usuarios' },
            ];
        }

        if (user.role === 'employee') {
            return [
                { id: 'profile', label: 'Mi perfil' },
                { id: 'shifts', label: 'Mis turnos' },
                { id: 'services', label: 'Servicios asignados' },
                { id: 'chats', label: 'Chats' },
            ];
        }

        // client por defecto
        return [
            { id: 'profile', label: 'Mi perfil' },
            { id: 'contracts', label: 'Mis contratos' },
            { id: 'services', label: 'Servicios activos' },
        ];
    }, [user]);

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
                                {section.label}
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
