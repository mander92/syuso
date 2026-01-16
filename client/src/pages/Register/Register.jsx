import { useState } from 'react';
import { Navigate, useNavigate, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

import './Register.css';
import { fetchRegisterUserServices } from '../../services/userService';
import useUser from '../../hooks/useUser';
import Button from '../../components/button/Button';

const Register = () => {
    const { user } = useUser();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dni, setDni] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setEmail('');
        setFirstName('');
        setLastName('');
        setDni('');
        setPhone('');
        setPassword('');
        setRepeatPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== repeatPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        try {
            setIsSubmitting(true);

            await fetchRegisterUserServices(
                email,
                firstName,
                lastName,
                dni,
                phone,
                password
            );

            toast.success(
                'Cuenta creada correctamente. Ahora puedes iniciar sesión.'
            );

            resetForm();
            navigate('/login');
        } catch (err) {
            toast.error(err.message || 'Error al registrarse');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user) return <Navigate to='/' />;

    return (
        <div className='register-wrapper'>
            <form className='register-card' onSubmit={handleSubmit}>
                <h1 className='register-title'>Crear cuenta</h1>
                <p className='register-subtitle'>
                    Rellena los datos para registrarte en SYUSO Seguridad.
                </p>

                <div className='form-group'>
                    <label htmlFor='email'>Email</label>
                    <input
                        id='email'
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder='correo@empresa.com'
                        required
                    />
                </div>

                <div className='form-group'>
                    <label htmlFor='firstName'>Nombre</label>
                    <input
                        id='firstName'
                        type='text'
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder='Tu nombre'
                        required
                    />
                </div>

                <div className='form-group'>
                    <label htmlFor='lastName'>Apellidos</label>
                    <input
                        id='lastName'
                        type='text'
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder='Tus apellidos'
                        required
                    />
                </div>

                <div className='form-group'>
                    <label htmlFor='password'>Contraseña</label>
                    <input
                        id='password'
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Mínimo 8 caracteres'
                        minLength='8'
                        required
                    />
                </div>

                <div className='form-group'>
                    <label htmlFor='repeatPassword'>Repetir contraseña</label>
                    <input
                        id='repeatPassword'
                        type='password'
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        placeholder='Repite tu contraseña'
                        minLength='8'
                        required
                    />
                </div>

                <div className='register-actions'>
                    <Button
                        variant='btn btn-secondary'
                        type='button'
                        onClick={resetForm}
                    >
                        Limpiar
                    </Button>

                    <Button
                        variant='btn btn-primary'
                        type='submit'
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creando cuenta...' : 'Registrarse'}
                    </Button>
                </div>

                <p className='register-login-link'>
                    ¿Ya tienes cuenta?{' '}
                    <NavLink to='/login'>Inicia sesión aquí</NavLink>
                </p>
            </form>
        </div>
    );
};

export default Register;
