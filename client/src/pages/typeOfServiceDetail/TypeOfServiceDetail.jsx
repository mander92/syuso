import { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { fetchTypeOfServiceByIdServices } from '../../services/typeOfServiceService';
import { buildImageUrl } from '../../utils/imageUrl';
import './TypeOfServiceDetail.css';

const TypeOfServiceDetail = () => {
    const { id } = useParams();
    const [service, setService] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const getService = async () => {
            try {
                setIsLoading(true);
                const data = await fetchTypeOfServiceByIdServices(id);
                setService(data);
            } catch (error) {
                toast.error(error.message || 'Error al cargar el servicio', {
                    id: 'service-detail-error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (id) getService();
    }, [id]);

    if (isLoading) {
        return (
            <div className='service-detail-loading'>
                <div className='service-detail-spinner' />
                <p>Cargando servicio...</p>
            </div>
        );
    }

    if (!service) {
        return (
            <div className='service-detail-empty'>
                <p>No se ha encontrado el servicio solicitado.</p>
                <NavLink to='/' className='service-detail-btn-light'>
                    Volver a servicios
                </NavLink>
            </div>
        );
    }


    return (
        <div className='service-detail-wrapper'>
            <div className='service-detail-card'>
                <div className='service-detail-image'>
                    <img
                        src={buildImageUrl(service.image)}
                        alt={service.description || service.type}
                    />
                </div>

                <div className='service-detail-body'>
                    <h1 className='service-detail-title'>{service.type}</h1>
                    <p className='service-detail-city'>
                        Ciudad: <span>{service.city}</span>
                    </p>
                    <p className='service-detail-description'>
                        {service.description}
                    </p>

                    <div className='service-detail-actions'>
                        {/* Aquí luego puedes enlazar a contacto, contratar, etc. */}
                        <NavLink
                            to='/'
                            className='service-detail-btn-light'
                        >
                            Volver a servicios
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypeOfServiceDetail;
