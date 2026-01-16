import { useContext, useEffect, useState } from 'react';
import { useParams, Navigate, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEditImageTypeOfServicesService,
    fetchEditTypeOfServiceServices,
    fetchTypeOfServiceByIdServices,
} from '../../services/typeOfServiceService.js';
import { buildImageUrl } from '../../utils/imageUrl.js';

import './TypeOfServiceEdit.css';

const TypeOfServiceEdit = () => {
    const { id } = useParams();
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [service, setService] = useState(null);
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingImage, setIsSavingImage] = useState(false);

    const loadService = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const data = await fetchTypeOfServiceByIdServices(id);
            setService(data);
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
                    <NavLink className='type-service-edit-back' to='/account'>
                        Volver
                    </NavLink>
                </div>
            </div>
        );
    }

    const handleSaveDetails = async (e) => {
        e.preventDefault();

        const trimmedDescription = description.trim();
        try {
            setIsSaving(true);
            const data = await fetchEditTypeOfServiceServices(
                id,
                trimmedDescription,
                authToken
            );

            toast.success(data.message || 'Servicio actualizado', {
                id: 'type-service-edit',
            });

            setService((prev) =>
                prev
                    ? { ...prev, description: trimmedDescription }
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

    const handleSaveImage = async (e) => {
        e.preventDefault();

        if (!imageFile) {
            toast.error('Selecciona una imagen');
            return;
        }

        try {
            setIsSavingImage(true);
            const data = await fetchEditImageTypeOfServicesService(
                imageFile,
                authToken,
                id
            );

            toast.success(data.message || 'Imagen actualizada', {
                id: 'type-service-image',
            });
            setImageFile(null);
            await loadService();
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar la imagen', {
                id: 'type-service-image-error',
            });
        } finally {
            setIsSavingImage(false);
        }
    };

    return (
        <div className='type-service-edit-wrapper'>
            <div className='type-service-edit-header'>
                <div>
                    <h1>Editar servicio</h1>
                    <p>Actualiza descripcion, precio e imagen.</p>
                </div>
                <NavLink className='type-service-edit-back' to='/account'>
                    Volver al panel
                </NavLink>
            </div>

            {isLoading ? (
                <div className='type-service-edit-card'>
                    <p>Cargando servicio...</p>
                </div>
            ) : !service ? (
                <div className='type-service-edit-card'>
                    <p>No se encontro el servicio solicitado.</p>
                    <NavLink className='type-service-edit-back' to='/account'>
                        Volver a servicios
                    </NavLink>
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
                                value={service.type || ''}
                                disabled
                            />

                            <label htmlFor='city'>Ciudad</label>
                            <input
                                id='city'
                                value={service.city || ''}
                                disabled
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

                    <section className='type-service-edit-card'>
                        <h2>Imagen</h2>
                        {service.image ? (
                            <img
                                className='type-service-edit-image'
                                src={buildImageUrl(service.image)}
                                alt={service.type || 'Servicio'}
                            />
                        ) : (
                            <div className='type-service-edit-image placeholder'>
                                Sin imagen
                            </div>
                        )}

                        <form
                            className='type-service-edit-form'
                            onSubmit={handleSaveImage}
                        >
                            <label htmlFor='image'>Nueva imagen</label>
                            <input
                                id='image'
                                type='file'
                                accept='image/png, image/jpg, image/jpeg, image/tiff'
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    setImageFile(file || null);
                                }}
                            />

                            <button type='submit' disabled={isSavingImage}>
                                {isSavingImage
                                    ? 'Actualizando...'
                                    : 'Actualizar imagen'}
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
};

export default TypeOfServiceEdit;
