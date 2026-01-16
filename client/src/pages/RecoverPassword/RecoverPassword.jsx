import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
    fetchSendRecoverPasswordUserServices,
    fetchChangePasswordUserServices,
} from '../../services/userService.js';
import './RecoverPassword.css';

const RecoverPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    const handleSendCode = async (e) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);
            await fetchSendRecoverPasswordUserServices(email);
            toast.success('Hemos enviado el codigo de recuperacion.');
        } catch (error) {
            toast.error(error.message || 'No se pudo enviar el codigo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== repeatPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        try {
            setIsChanging(true);
            await fetchChangePasswordUserServices(code, newPassword);
            toast.success('Contraseña actualizada');
            navigate('/login');
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar la contraseña');
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div className='recover-page'>
            <div className='recover-card'>
                <h1>Recuperar contraseña</h1>
                <p className='recover-subtitle'>
                    Solicita un codigo y establece una nueva contraseña.
                </p>

                <form className='recover-form' onSubmit={handleSendCode}>
                    <h2>Solicitar codigo</h2>
                    <label htmlFor='email'>Email</label>
                    <input
                        id='email'
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder='tu@email.com'
                        required
                    />
                    <button type='submit' disabled={isSubmitting}>
                        {isSubmitting ? 'Enviando...' : 'Enviar codigo'}
                    </button>
                </form>

                <form className='recover-form' onSubmit={handleChangePassword}>
                    <h2>Actualizar contraseña</h2>
                    <label htmlFor='code'>Codigo</label>
                    <input
                        id='code'
                        type='text'
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder='Codigo de recuperacion'
                        required
                    />
                    <label htmlFor='newPassword'>Nueva contraseña</label>
                    <input
                        id='newPassword'
                        type='password'
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength='8'
                        required
                    />
                    <label htmlFor='repeatPassword'>Repite contraseña</label>
                    <input
                        id='repeatPassword'
                        type='password'
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        minLength='8'
                        required
                    />
                    <button type='submit' disabled={isChanging}>
                        {isChanging ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RecoverPassword;
