import './Header.css';

import { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../../assets/syusoLogo.jpg';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { useChatNotifications } from '../../../context/ChatNotificationsContext.jsx';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Leemos del contexto
    const { authToken, authLogout } = useContext(AuthContext);
    const { unreadTotal } = useChatNotifications();
    const isLoggedIn = Boolean(authToken);

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        authLogout(); // esto ya borra el token + localStorage
        closeMenu(); // cerramos menú móvil
        navigate('/'); // te lleva a la home
    };

    return (
        <header className={`header ${isMenuOpen ? 'header--menu-open' : ''}`}>
            <NavLink to={'/'}>
                <div className='header-left'>
                    <img
                        src={logo}
                        alt='SYUSO Seguridad'
                        className='header-logo'
                    />
                </div>
            </NavLink>

            {/* Navegación desktop */}
            <nav className='header-nav'>
                {isLoggedIn ? (
                    <>
                        {/* Mi cuenta cuando está loggeado */}
                        <NavLink to={'/account'}>
                            <button className='nav-btn nav-btn-chat'>
                                Mi cuenta
                                {unreadTotal > 0 ? (
                                    <span className='nav-chat-badge'>
                                        {unreadTotal}
                                    </span>
                                ) : null}
                            </button>
                        </NavLink>

                        {/* Botón de salir */}
                        <button
                            className='nav-btn nav-btn-primary'
                            onClick={handleLogout}
                        >
                            Salir
                        </button>
                    </>
                ) : (
                    <>
                        {/* Estado no loggeado: Regístrate + Iniciar sesión */}
                        <NavLink to={'/register'}>
                            <button className='nav-btn'>Regístrate</button>
                        </NavLink>
                        <NavLink to={'/login'}>
                            <button className='nav-btn nav-btn-primary'>
                                Iniciar Sesión
                            </button>
                        </NavLink>
                    </>
                )}
            </nav>

            {/* Botón hamburguesa (solo móvil) */}
            <button
                className={`burger-btn ${isMenuOpen ? 'burger-btn--open' : ''}`}
                onClick={toggleMenu}
                aria-label='Abrir menú'
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Menú móvil desplegable */}
            <nav
                className={`mobile-nav ${isMenuOpen ? 'mobile-nav--open' : ''}`}
            >
                {isLoggedIn ? (
                    <>
                        <NavLink to='/account' onClick={closeMenu}>
                            <button className='mobile-nav-btn mobile-nav-btn-chat'>
                                Mi cuenta
                                {unreadTotal > 0 ? (
                                    <span className='mobile-chat-badge'>
                                        {unreadTotal}
                                    </span>
                                ) : null}
                            </button>
                        </NavLink>
                        <button
                            className='mobile-nav-btn mobile-nav-btn-primary'
                            onClick={handleLogout}
                        >
                            Salir
                        </button>
                    </>
                ) : (
                    <>
                        <NavLink to='/register' onClick={closeMenu}>
                            <button className='mobile-nav-btn'>
                                Regístrate
                            </button>
                        </NavLink>
                        <NavLink to='/login' onClick={closeMenu}>
                            <button className='mobile-nav-btn mobile-nav-btn-primary'>
                                Iniciar Sesión
                            </button>
                        </NavLink>
                    </>
                )}
            </nav>
        </header>
    );
}
