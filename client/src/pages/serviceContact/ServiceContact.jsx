import { useMemo, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '../../components/button/Button';
import { sendConsultingRequestService } from '../../services/requestsService';
import '../consulting/Consulting.css';

const SERVICE_INFO = {
    'seguridad-fisica': {
        tag: 'Seguridad fisica',
        title: 'Refuerza la proteccion presencial de tus instalaciones.',
        text:
            'Solicita un plan de vigilancia con personal habilitado, control de accesos y rondas preventivas adaptadas a tu actividad.',
        highlights: [
            { label: 'Empresas', text: 'Control de accesos y rondas internas.' },
            { label: 'Comunidades', text: 'Presencia disuasoria 24/7.' },
            { label: 'Eventos', text: 'Cobertura puntual y coordinada.' },
        ],
        topic: 'seguridad-fisica',
    },
    'monitoreo-alarmas': {
        tag: 'Monitoreo y alarmas',
        title: 'Centraliza tus alarmas con respuesta inmediata.',
        text:
            'Integramos tu sistema con central receptora para verificacion, aviso y gestion de incidencias en tiempo real.',
        highlights: [
            { label: 'Alarmas 24/7', text: 'Supervision continua.' },
            { label: 'Incidencias', text: 'Respuesta coordinada.' },
            { label: 'Reportes', text: 'Informes claros y trazables.' },
        ],
        topic: 'monitoreo-alarmas',
    },
    videovigilancia: {
        tag: 'Videovigilancia',
        title: 'Control total con CCTV y analitica de video.',
        text:
            'Implementamos camaras profesionales y acceso remoto seguro para controlar tus espacios en cualquier momento.',
        highlights: [
            { label: 'CCTV pro', text: 'Calidad HD y vision nocturna.' },
            { label: 'Acceso remoto', text: 'Monitoriza desde tu movil.' },
            { label: 'Respaldo', text: 'Grabaciones seguras.' },
        ],
        topic: 'videovigilancia',
    },
    'consultoria-auditoria': {
        tag: 'Consultoria y auditoria',
        title: 'Evaluamos riesgos y optimizamos tus protocolos.',
        text:
            'Analizamos tu situacion actual, detectamos vulnerabilidades y definimos un plan de seguridad personalizado.',
        highlights: [
            { label: 'Diagnostico', text: 'Revision de puntos criticos.' },
            { label: 'Plan accion', text: 'Medidas aplicables y realistas.' },
            { label: 'Formacion', text: 'Equipo preparado.' },
        ],
        topic: 'consultoria-auditoria',
    },
};

const ServiceContact = () => {
    const { serviceKey } = useParams();
    const info = useMemo(() => SERVICE_INFO[serviceKey], [serviceKey]);

    const [fullName, setFullName] = useState('');
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [acceptPolicy, setAcceptPolicy] = useState(false);

    if (!info) {
        return <Navigate to='/' />;
    }

    const resetForm = () => {
        setFullName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setMessage('');
        setAcceptPolicy(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!acceptPolicy) {
            toast.error('Debes aceptar la politica de privacidad');
            return;
        }

        try {
            setIsSubmitting(true);
            await sendConsultingRequestService({
                fullName,
                company,
                email,
                phone,
                topic: info.topic,
                message,
            });
            toast.success(
                'Hemos recibido tu solicitud. Te contactaremos pronto.'
            );
            resetForm();
        } catch (error) {
            toast.error(error.message || 'No se ha podido enviar la solicitud');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='consulting-page'>
            <section className='consulting-wrapper'>
                <div className='consulting-info'>
                    <p className='consulting-tag'>{info.tag}</p>
                    <h1 className='consulting-title'>{info.title}</h1>
                    <p className='consulting-text'>{info.text}</p>

                    <div className='consulting-highlights'>
                        {info.highlights.map((item) => (
                            <div className='consulting-highlight' key={item.label}>
                                <span className='ch-label'>{item.label}</span>
                                <p>{item.text}</p>
                            </div>
                        ))}
                    </div>

                    <NavLink to='/' className='consulting-back'>
                        Volver al inicio
                    </NavLink>
                </div>

                <div className='consulting-form-card'>
                    <h2>Contacta con nuestro equipo</h2>
                    <p className='consulting-form-subtitle'>
                        Cuntanos tu necesidad y te responderemos en menos de
                        24 horas laborales.
                    </p>

                    <form className='consulting-form' onSubmit={handleSubmit}>
                        <div className='form-row'>
                            <div className='form-group'>
                                <label htmlFor='fullName'>Nombre completo</label>
                                <input
                                    id='fullName'
                                    type='text'
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    placeholder='Tu nombre y apellidos'
                                    required
                                />
                            </div>

                            <div className='form-group'>
                                <label htmlFor='company'>
                                    Empresa (opcional)
                                </label>
                                <input
                                    id='company'
                                    type='text'
                                    value={company}
                                    onChange={(e) =>
                                        setCompany(e.target.value)
                                    }
                                    placeholder='Nombre de la empresa'
                                />
                            </div>
                        </div>

                        <div className='form-row'>
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
                                <label htmlFor='phone'>Telefono</label>
                                <input
                                    id='phone'
                                    type='tel'
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder='+34 600 000 000'
                                    required
                                />
                            </div>
                        </div>

                        <div className='form-group'>
                            <label htmlFor='message'>
                                Cuntanos qu necesitas
                            </label>
                            <textarea
                                id='message'
                                rows='4'
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder='Describe horarios, ubicacion y contexto'
                                required
                            />
                        </div>

                        <div className='form-footer'>
                            <label className='checkbox-label'>
                                <input
                                    type='checkbox'
                                    checked={acceptPolicy}
                                    onChange={(e) =>
                                        setAcceptPolicy(e.target.checked)
                                    }
                                />
                                <span>
                                    He leido y acepto la politica de privacidad.
                                </span>
                            </label>

                            <div className='consulting-buttons'>
                                <Button
                                    variant='btn btn-secondary'
                                    type='button'
                                    onClick={resetForm}
                                    disabled={isSubmitting}
                                >
                                    Limpiar
                                </Button>
                                <Button
                                    variant='btn btn-primary'
                                    type='submit'
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? 'Enviando...'
                                        : 'Enviar solicitud'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default ServiceContact;
