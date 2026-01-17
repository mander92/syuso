import './ServiceComponent.css';

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ListServicesComponent from '../ListServicesComponent/ListServicesComponent.jsx';
import RegisterServicesComponent from '../RegisterServicesComponent/RegisterServiceComponent.jsx';

const ServicesComponent = () => {
    const [activeSection, setActiveSection] = useState('ListServicesComponent');

    const handleChange = (section, e) => {
        e.preventDefault();
        setActiveSection(section);
    };

    const sectionComponents = {
        ListServicesComponent: <ListServicesComponent />,
        RegisterServicesComponent: <RegisterServicesComponent />,
    };

    return (
        <>
            <div className='services-header'>
                <h1 className='services-title'>Tipos de servicios</h1>
                <p className='services-subtitle'>
                    Gestiona las categorias disponibles para los servicios.
                </p>
            </div>
            <div className='manager-tabs'>
                <NavLink
                    className={
                        activeSection === 'ListServicesComponent' &&
                        'activeSelectedLink'
                    }
                    onClick={(e) => {
                        handleChange('ListServicesComponent', e);
                    }}
                >
                    Ver Todos
                </NavLink>
                <NavLink
                    className={
                        activeSection === 'RegisterServicesComponent' &&
                        'activeSelectedLink'
                    }
                    onClick={(e) => {
                        handleChange('RegisterServicesComponent', e);
                    }}
                >
                    Registrar
                </NavLink>
            </div>
            {sectionComponents[activeSection]}
        </>
    );
};

export default ServicesComponent;
