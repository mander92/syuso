import { useContext, useEffect, useState } from 'react';
import { useParams, Navigate, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEditTypeOfServiceServices,
    fetchTypeOfServiceByIdServices,
} from '../../services/typeOfServiceService.js';

import './TypeOfServiceEdit.css';

const TypeOfServiceEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [service, setService] = useState(null);
    const [type, setType] = useState('');
    const [city, setCity] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadService = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const data = await fetchTypeOfServiceByIdServices(id);
            setService(data);
            setType(data?.type || '');
            setCity(data?.city || '');
            setDescription(data?.description || '');
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar el servicio', {
                id: 'type-service-load',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadService();
    }, [id]);

    if (!authToken) return <Navigate to='/login' />;

    if (user && user.role !== 'admin' && user.role !== 'sudo') {
        return (
            <div className='type-service-edit-wrapper'>
                <div className='type-service-edit-card'>
                    <h1>Acceso restringido</h1>
                    <p>Solo administradores pueden editar servicios.</p>
                    <button
                        type='button'
                        className='type-service-edit-back'
                        onClick={() => navigate(-1)}
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const handleSaveDetails = async (e) => {
        e.preventDefault();

        const trimmedType = type.trim();
        const trimmedCity = city.trim();
        const trimmedDescription = description.trim();
        try {
            setIsSaving(true);
            const data = await fetchEditTypeOfServiceServices(
                id,
                {
                    type: trimmedType,
                    city: trimmedCity,
                    description: trimmedDescription,
                },
                authToken
            );

            toast.success(data.message || 'Servicio actualizado', {
                id: 'type-service-edit',
            });

            setService((prev) =>
                prev
                    ? {
                        ...prev,
                        type: trimmedType,
                        city: trimmedCity,
                        description: trimmedDescription,
                    }
                    : prev
            );
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar', {
                id: 'type-service-edit-error',
            });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className='type-service-edit-wrapper'>
            <div className='type-service-edit-header'>
                <div>
                    <h1>Editar servicio</h1>
                    <p>Actualiza descripcion, tipo y ciudad.</p>
                </div>
                <button
                    type='button'
                    className='type-service-edit-back'
                    onClick={() => navigate(-1)}
                >
                    Volver al panel
                </button>
            </div>

            {isLoading ? (
                <div className='type-service-edit-card'>
                    <p>Cargando servicio...</p>
                </div>
            ) : !service ? (
                <div className='type-service-edit-card'>
                    <p>No se encontro el servicio solicitado.</p>
                    <button
                        type='button'
                        className='type-service-edit-back'
                        onClick={() => navigate(-1)}
                    >
                        Volver a servicios
                    </button>
                </div>
            ) : (
                <div className='type-service-edit-grid'>
                    <section className='type-service-edit-card'>
                        <h2>Detalles</h2>
                        <form
                            className='type-service-edit-form'
                            onSubmit={handleSaveDetails}
                        >
                            <label htmlFor='type'>Tipo</label>
                            <input
                                id='type'
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                required
                            />

                            <label htmlFor='city'>Ciudad</label>
                            <input
                                id='city'
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                            />


                            <label htmlFor='description'>Descripcion</label>
                            <textarea
                                id='description'
                                rows='4'
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />

                            <button type='submit' disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </form>
                    </section>

                </div>
            )}
        </div>
    );
};

export default TypeOfServiceEdit;
