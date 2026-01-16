import './Footer.css';
import { NavLink } from 'react-router-dom';
import logo from '../../../assets/syusoLogo.png';

export default function Footer() {
    return (
        <footer className='footer'>
            <div className='footer-container'>
                <div className='footer-col footer-col-logo'>
                    <img
                        src={logo}
                        alt='SYUSO Seguridad'
                        className='footer-logo'
                    />
                    <p className='footer-description'>
                        Seguridad profesional, proteccion integral y soluciones
                        avanzadas para empresas y particulares.
                    </p>
                </div>

                <div className='footer-col'>
                    <h4>Empresa</h4>
                    <ul>
                        <li>
                            <NavLink to='/'>Inicio</NavLink>
                        </li>
                        <li>
                            <NavLink to='/contact/consultoria-auditoria'>
                                Consultoria y auditoria
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to='/work'>Trabaja con nosotros</NavLink>
                        </li>
                        <li>
                            <NavLink to='/contact/consultoria-auditoria'>
                                Contacto
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div className='footer-col'>
                    <h4>Servicios</h4>
                    <ul>
                        <li>
                            <NavLink to='/contact/seguridad-fisica'>
                                Seguridad fisica
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to='/contact/monitoreo-alarmas'>
                                Monitoreo y alarmas
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to='/contact/videovigilancia'>
                                Videovigilancia
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to='/contact/consultoria-auditoria'>
                                Consultoria y auditoria
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div className='footer-col'>
                    <h4>Contacto</h4>
                    <ul>
                        <li>
                            Sevilla, Espana
                        </li>
                        <li>
                            +34 621 00 84 48
                        </li>
                        <li>
                            administracion@syuso.es
                        </li>
                    </ul>
                </div>
            </div>

            <div className='footer-bottom'>
                <p>
                    ? {new Date().getFullYear()} SYUSO Seguridad. Todos los
                    derechos reservados.
                </p>
            </div>
        </footer>
    );
}
