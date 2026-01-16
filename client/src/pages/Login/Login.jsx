import { useContext, useState } from 'react';
import { fetchLoginUserServices } from '../../services/userService';
import { Navigate, useNavigate, NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import Button from '../../components/button/button';
import './Login.css';
import toast from 'react-hot-toast';

const Login = () => {
    const { authLogin } = useContext(AuthContext);
    const { user } = useUser();

    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const resetInputs = (e) => {
        e.preventDefault();
        setEmail('');
        setPassword('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const authToken = await fetchLoginUserServices(email, password);

            authLogin(authToken.data);

            navigate('/');
        } catch (error) {
            toast.error(error.message, {
                id: 'error',
            });
        }
    };

    if (user) return <Navigate to='/' />;

    return (
        <form className='login-wrapper' onSubmit={handleLogin}>
            <div className='login-card'>
                <h1 className='login-title'>Inicio de sesión</h1>
                <p className='login-subtitle'>
                    Introduce tus datos para continuar
                </p>

                <fieldset>
                    <div className='form-group'>
                        <label htmlFor='email'>Email</label>
                        <input
                            type='email'
                            id='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='Escribe aquí tu email'
                            required
                        />
                    </div>

                    <div className='form-group'>
                        <label htmlFor='password'>Contraseña</label>
                        <input
                            type='password'
                            id='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Escribe aquí tu contraseña'
                            minLength='8'
                            required
                        />
                    </div>

                    <div className='login-buttons'>
                        <Button
                            variant='btn btn-primary'
                            children='Iniciar'
                            type='submit'
                        />

                        <Button
                            variant='btn btn-secondary'
                            children='Limpiar'
                            onClick={resetInputs}
                        />
                    </div>
                    <div className='login-recover'>
                        <NavLink to='/recoverpassword'>
                            ¿Has olvidado tu contraseña?
                        </NavLink>
                    </div>
                </fieldset>
            </div>
        </form>
    );
};

export default Login;
