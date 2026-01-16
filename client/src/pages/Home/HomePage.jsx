import './HomePage.css';
import { NavLink } from 'react-router-dom';
import Button from '../../components/button/button';

export default function Home() {
    return (
        <div className='home'>
            {/* HERO PRINCIPAL */}
            <section className='hero'>
                <div className='hero-content'>
                    <p className='hero-tag'>Seguridad profesional 24/7</p>
                    <h1>
                        Protección integral
                        <span> para lo que más importa.</span>
                    </h1>
                    <p className='hero-subtitle'>
                        En SYUSO Seguridad ofrecemos soluciones avanzadas de
                        vigilancia, monitoreo y protección para empresas y
                        particulares, con personal altamente cualificado y
                        tecnología de última generación.
                    </p>

                    <div className='hero-actions'>

                        <NavLink to='/contact/consultoria-auditoria'>
                            <Button variant='btn btn-secondary'>
                                Solicitar asesoría
                            </Button>
                        </NavLink>
                    </div>

                    <div className='hero-stats'>
                        <div className='hero-stat'>
                            <strong>10+</strong>
                            <span>Años de experiencia</span>
                        </div>
                        <div className='hero-stat'>
                            <strong>150+</strong>
                            <span>Clientes protegidos</span>
                        </div>
                        <div className='hero-stat'>
                            <strong>24/7</strong>
                            <span>Monitoreo continuo</span>
                        </div>
                    </div>
                </div>

                <div className='hero-panel'>
                    <div className='hero-card'>
                        <h3>Trabaja con nosotros</h3>
                        <p>Mándanos tu CV y te llamaremos lo antes posible.</p>
                        <NavLink to='/work'>
                            <Button variant='btn btn-secondary'>
                                Enviar mi CV
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* SECCIÓN SERVICIOS */}
            <section className='home-section home-services' id='servicios'>
                <div className='section-header'>
                    <h2>Servicios de seguridad</h2>
                    <p>
                        Diseñamos soluciones a medida según el nivel de riesgo,
                        el tipo de instalación y las necesidades de cada
                        cliente.
                    </p>
                </div>

                <div className='services-grid'>
                    <article className='service-card'>
                        <h3>Seguridad física</h3>
                        <p>
                            Vigilantes de seguridad habilitados, control de
                            accesos y rondas preventivas en instalaciones.
                        </p>
                        <ul>
                            <li>Vigilancia en empresas</li>
                            <li>Comunidades y urbanizaciones</li>
                            <li>Eventos y recintos privados</li>
                        </ul>
                        <div className='service-card-actions'>
                            <NavLink to='/contact/seguridad-fisica'>
                                <Button variant='btn btn-primary'>
                                    Contactar
                                </Button>
                            </NavLink>
                        </div>
                    </article>

                    <article className='service-card'>
                        <h3>Monitoreo y alarmas</h3>
                        <p>
                            Sistemas de alarma conectados a central receptora,
                            con aviso inmediato y verificación de señales.
                        </p>
                        <ul>
                            <li>Alarmas conectadas 24/7</li>
                            <li>Gestión de incidencias</li>
                            <li>Informe de eventos</li>
                        </ul>
                        <div className='service-card-actions'>
                            <NavLink to='/contact/monitoreo-alarmas'>
                                <Button variant='btn btn-primary'>
                                    Contactar
                                </Button>
                            </NavLink>
                        </div>
                    </article>

                    <article className='service-card'>
                        <h3>Videovigilancia</h3>
                        <p>
                            Cámaras de seguridad, análisis de vídeo y acceso
                            remoto para supervisar tus instalaciones en tiempo
                            real.
                        </p>
                        <ul>
                            <li>CCTV profesional</li>
                            <li>Acceso desde app</li>
                            <li>Almacenamiento seguro</li>
                        </ul>
                        <div className='service-card-actions'>
                            <NavLink to='/contact/videovigilancia'>
                                <Button variant='btn btn-primary'>
                                    Contactar
                                </Button>
                            </NavLink>
                        </div>
                    </article>

                    <article className='service-card'>
                        <h3>Consultoría y auditoría</h3>
                        <p>
                            Evaluación de riesgos, diseño de planes de seguridad
                            y mejora de protocolos internos.
                        </p>
                        <ul>
                            <li>Planes de seguridad</li>
                            <li>Análisis de vulnerabilidades</li>
                            <li>Formación al personal</li>
                        </ul>
                        <div className='service-card-actions'>
                            <NavLink to='/contact/consultoria-auditoria'>
                                <Button variant='btn btn-primary'>
                                    Contactar
                                </Button>
                            </NavLink>
                        </div>
                    </article>
                </div>
            </section>

            {/* POR QUÉ SYUSO */}
            <section className='home-section home-why'>
                <div className='why-text'>
                    <h2 className='why-title'>¿Por qué SYUSO Seguridad?</h2>
                    <p>
                        Sabemos que la seguridad no admite errores. Por eso
                        combinamos experiencia, tecnología y un equipo humano
                        altamente preparado para ofrecer un servicio fiable y
                        cercano.
                    </p>
                    <div className='why-items'>
                        <div className='why-item'>
                            <h4>Equipo certificado</h4>
                            <p>
                                Vigilantes y operadores con habilitación oficial
                                y formación continua.
                            </p>
                        </div>
                        <div className='why-item'>
                            <h4>Respuesta rápida</h4>
                            <p>
                                Protocolos claros y tiempos de actuación
                                optimizados ante cualquier incidencia.
                            </p>
                        </div>
                        <div className='why-item'>
                            <h4>Tecnología avanzada</h4>
                            <p>
                                Sistemas de última generación para detección,
                                análisis y reporte.
                            </p>
                        </div>
                    </div>
                </div>

                <div className='why-panel'>
                    <div className='why-card'>
                        <h3>Protegemos tu empresa como si fuera la nuestra.</h3>
                        <p>
                            Hablemos sobre tus riesgos actuales y diseñemos un
                            plan de seguridad adaptado a tu realidad.
                        </p>
                        <NavLink to='/contact/consultoria-auditoria'>
                            <Button variant='btn btn-secondary btn-full'>
                                Solicitar estudio de seguridad
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* BANDA CTA FINAL */}
            <section className='home-cta'>
                <div className='home-cta-content'>
                    <h2>¿Listo para elevar el nivel de seguridad?</h2>
                    <p>
                        Cuéntanos qué necesitas y te proponemos una solución
                        completa en menos de 24 horas laborales.
                    </p>
                </div>
                <div className='home-cta-actions'>
                    {/* CONTACTAR → LLAMADA DIRECTA */}
                    <a href='tel:+34644185486'>
                        <Button variant='btn btn-primary'>
                            Contactar ahora
                        </Button>
                    </a>

                    {/* Solicita una llamada → forma del sistema */}
                    <NavLink to='/contact/consultoria-auditoria'>
                        <Button variant='btn btn-secondary'>
                            Solicita una llamada
                        </Button>
                    </NavLink>
                </div>
            </section>
        </div>
    );
}
