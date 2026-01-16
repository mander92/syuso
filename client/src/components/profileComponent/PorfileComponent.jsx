// src/components/ProfileComponent.jsx
import { AuthContext } from '../../context/AuthContext';
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchEditUserServices,
    fetchEditPasswordUserServices,
    fetchDeleteUserServices,
} from '../../services/userService.js';
import useUser from '../../hooks/useUser';
import toast from 'react-hot-toast';
import './ProfileComponent.css'; // 👈 importa los estilos

const ProfileComponent = () => {
    const { user } = useUser();
    const { authToken, authLogout } = useContext(AuthContext);
    const navigate = useNavigate();
    const userId = user?.id;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [actualPassword, setActualPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatedNewPassword, setRepeatedNewPassword] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user?.firstName || '');
            setLastName(user?.lastName || '');
            setPhone(user?.phone || '');
        }
    }, [user]);

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            const data = await fetchEditUserServices(
                authToken,
                firstName,
                lastName,
                phone,
                userId
            );
            toast.success(data.message, { id: 'ok' });
        } catch (error) {
            toast.error(error.message, { id: 'error' });
        }
    };

    const handleEditPassword = async (e) => {
        e.preventDefault();
        try {
            if (newPassword !== repeatedNewPassword) {
                throw new Error('¡Las nuevas contraseñas no coinciden!');
            }

            const data = await fetchEditPasswordUserServices(
                authToken,
                actualPassword,
                newPassword,
                userId
            );
            toast.success(data.message, { id: 'ok' });

            setActualPassword('');
            setNewPassword('');
            setRepeatedNewPassword('');
        } catch (error) {
            toast.error(error.message, { id: 'error' });
        }
    };

    const handleDeleteUser = async (e) => {
        e.preventDefault();

        if (
            window.confirm(
                '¿Estás seguro de querer eliminar tu cuenta?\n¡¡¡Esta acción no se puede deshacer!!!'
            )
        ) {
            try {
                const data = await fetchDeleteUserServices(authToken, userId);
                toast.success(data.message, { id: 'ok' });
                authLogout();
                navigate('/');
            } catch (error) {
                toast.error(error.message, { id: 'error' });
            }
        }
    };

    if (!user) return null;

    return (
        <section className='profile-page'>
            <div className='profile-layout'>
                {/* Tarjeta de datos personales */}
                <form
                    className='profile-card profile-card--main'
                    onSubmit={handleEditUser}
                >
                    <fieldset className='profile-fieldset'>
                        <legend className='profile-legend'>
                            Datos personales
                        </legend>

                        <div className='profile-field'>
                            <label className='profile-label' htmlFor='email'>
                                Email
                            </label>
                            <input
                                className='profile-input profile-input--disabled'
                                id='email'
                                disabled
                                value={user?.email || ''}
                            />
                        </div>

                        <div className='profile-field'>
                            <label className='profile-label' htmlFor='role'>
                                Rol
                            </label>
                            <input
                                className='profile-input profile-input--disabled'
                                id='role'
                                disabled
                                value={user?.role || ''}
                            />
                        </div>

                        <div className='profile-field'>
                            <label
                                className='profile-label'
                                htmlFor='firstName'
                            >
                                Nombre
                            </label>
                            <input
                                className='profile-input'
                                type='text'
                                id='firstName'
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>

                        <div className='profile-field'>
                            <label className='profile-label' htmlFor='lastName'>
                                Apellidos
                            </label>
                            <input
                                className='profile-input'
                                type='text'
                                id='lastName'
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>

                        <div className='profile-field'>
                            <label className='profile-label' htmlFor='dni'>
                                DNI
                            </label>
                            <input
                                className='profile-input profile-input--disabled'
                                id='dni'
                                disabled
                                value={user?.dni || ''}
                            />
                        </div>

                        <div className='profile-field'>
                            <label className='profile-label' htmlFor='phone'>
                                Teléfono
                            </label>
                            <input
                                className='profile-input'
                                type='tel'
                                id='phone'
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>

                        {user?.role === 'employee' && (
                            <>
                                <div className='profile-field'>
                                    <label
                                        className='profile-label'
                                        htmlFor='job'
                                    >
                                        Trabajo
                                    </label>
                                    <input
                                        className='profile-input profile-input--disabled'
                                        id='job'
                                        disabled
                                        value={user?.job || ''}
                                    />
                                </div>

                                <div className='profile-field'>
                                    <label
                                        className='profile-label'
                                        htmlFor='city'
                                    >
                                        Ciudad
                                    </label>
                                    <input
                                        className='profile-input profile-input--disabled'
                                        id='city'
                                        disabled
                                        value={user?.city || ''}
                                    />
                                </div>
                            </>
                        )}

                        <div className='profile-actions'>
                            <button type='submit' className='profile-button'>
                                Guardar cambios
                            </button>
                        </div>
                    </fieldset>
                </form>

                {/* Tarjeta de contraseña + eliminar cuenta */}
                <div className='profile-side'>
                    <form
                        className='profile-card'
                        onSubmit={handleEditPassword}
                    >
                        <fieldset className='profile-fieldset'>
                            <legend className='profile-legend'>
                                Cambiar contraseña
                            </legend>

                            <div className='profile-field'>
                                <label
                                    className='profile-label'
                                    htmlFor='actualPassword'
                                >
                                    Contraseña actual
                                </label>
                                <input
                                    className='profile-input'
                                    type='password'
                                    id='actualPassword'
                                    value={actualPassword}
                                    placeholder='Escribe tu contraseña actual'
                                    minLength='8'
                                    maxLength='25'
                                    required
                                    onChange={(e) =>
                                        setActualPassword(e.target.value)
                                    }
                                />
                            </div>

                            <div className='profile-field'>
                                <label
                                    className='profile-label'
                                    htmlFor='newPassword'
                                >
                                    Nueva contraseña
                                </label>
                                <input
                                    className='profile-input'
                                    type='password'
                                    id='newPassword'
                                    value={newPassword}
                                    placeholder='Escribe tu nueva contraseña'
                                    minLength='8'
                                    maxLength='25'
                                    required
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                />
                            </div>

                            <div className='profile-field'>
                                <label
                                    className='profile-label'
                                    htmlFor='repeatNewPassword'
                                >
                                    Repetir contraseña
                                </label>
                                <input
                                    className='profile-input'
                                    type='password'
                                    id='repeatNewPassword'
                                    placeholder='Repite tu nueva contraseña'
                                    minLength='8'
                                    maxLength='25'
                                    required
                                    value={repeatedNewPassword}
                                    onChange={(e) =>
                                        setRepeatedNewPassword(e.target.value)
                                    }
                                />
                            </div>

                            <div className='profile-actions'>
                                <button
                                    type='submit'
                                    className='profile-button'
                                >
                                    Cambiar contraseña
                                </button>
                            </div>
                        </fieldset>
                    </form>

                    {(user.role === 'admin' || user.role === 'sudo') && (
                        <form
                            className='profile-card profile-card--danger'
                            onSubmit={handleDeleteUser}
                        >
                            <fieldset className='profile-fieldset'>
                                <legend className='profile-legend profile-legend--danger'>
                                    Eliminar cuenta
                                </legend>

                                <p className='profile-danger-text'>
                                    Esta acción es permanente y no se puede
                                    deshacer.
                                </p>

                                <div className='profile-actions'>
                                    <button
                                        className='profile-button profile-button--danger'
                                        type='submit'
                                    >
                                        Eliminar usuario
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ProfileComponent;
