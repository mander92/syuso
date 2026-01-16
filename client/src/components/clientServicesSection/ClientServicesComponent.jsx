import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import { fetchClientAllServicesServices } from '../../services/serviceService.js';
import './ClientServicesComponent.css';

const ClientServicesComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadServices = async () => {
            if (!authToken) return;
            try {
                setLoading(true);
                const data = await fetchClientAllServicesServices('', authToken);
                setServices(data || []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los servicios'
                );
            } finally {
                setLoading(false);
            }
        };

        loadServices();
    }, [authToken]);

    return (
        <section className='client-services'>
            <div className='client-services-header'>
                <h1>Servicios activos</h1>
                <p>Estos son tus servicios actuales.</p>
            </div>

            {loading ? (
                <p className='client-services-loading'>Cargando servicios...</p>
            ) : (
                <ul className='client-services-list'>
                    {services.map((service) => (
                        <li key={service.id} className='client-service-card'>
                            <div className='client-service-card-row'>
                                <div>
                                    <h3>{service.name || service.type}</h3>
                                    <p>Tipo: {service.type}</p>
                                    <p>
                                        Fecha:{' '}
                                        {new Date(
                                            service.startDateTime
                                        ).toLocaleString()}
                                    </p>
                                    <p>Estado: {service.status}</p>
                                    <p>
                                        Direccion: {service.address},{' '}
                                        {service.city}
                                    </p>
                                </div>
                                <div className='client-service-card-actions'>
                                    <span className='client-service-chat-note'>
                                        Chat solo interno
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default ClientServicesComponent;
