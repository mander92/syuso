import './Consulting.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../../components/button/Button';
import { sendConsultingRequestService } from '../../services/requestsService';

const Consulting = () => {
    const [searchParams] = useSearchParams();

    const [fullName, setFullName] = useState('');
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [topic, setTopic] = useState('general');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [acceptPolicy, setAcceptPolicy] = useState(false);

    // Si viene ?type=callback desde Home, preseleccionamos motivo
    useEffect(() => {
        const type = searchParams.get('type');

        if (type === 'callback') {
            setTopic('callback');
        }
    }, [searchParams]);

    const resetForm = () => {
        setFullName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setTopic('general');
        setMessage('');
        setAcceptPolicy(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!topic) {
            toast.error('Selecciona el tipo de consulta');
            return;
        }

        try {
            setIsSubmitting(true);

            const data = await sendConsultingRequestService({
                fullName,
                company,
                email,
                phone,
                topic,
                message,
            });

            console.log('Consulta creada con ID:', data.id);

            toast.success(
                'Hemos recibido tu solicitud. Te contactaremos en breve.'
            );
            resetForm();
        } catch (err) {
            toast.error(err.message || 'No se ha podido enviar la solicitud');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='consulting-page'>
            <section className='consulting-wrapper'>
                <div className='consulting-info'>
                    <p className='consulting-tag'>Asesoría de seguridad</p>
                    <h1 className='consulting-title'>
                        Diseñamos el plan de seguridad que tu empresa necesita.
                    </h1>
                    <p className='consulting-text'>
                        Cuéntanos brevemente tu situación y te propondremos una
                        solución adaptada al nivel de riesgo, tipo de
                        instalación y presupuesto disponible. Sin compromiso.
                    </p>

                    <div className='consulting-highlights'>
                        <div className='consulting-highlight'>
                            <span className='ch-label'>Empresas y pymes</span>
                            <p>
                                Protección integral para oficinas, naves y
                                locales.
                            </p>
                        </div>
                        <div className='consulting-highlight'>
                            <span className='ch-label'>Comunidades</span>
                            <p>
                                Seguridad en urbanizaciones, garajes y zonas
                                comunes.
                            </p>
                        </div>
                        <div className='consulting-highlight'>
                            <span className='ch-label'>Particulares</span>
                            <p>Viviendas, chalets y segundas residencias.</p>
                        </div>
                    </div>
                </div>

                <div className='consulting-form-card'>
                    <h2>Solicita tu estudio de seguridad</h2>
                    <p className='consulting-form-subtitle'>
                        Rellena el formulario y te responderemos en menos de 24
                        horas laborales.
                    </p>

                    <form className='consulting-form' onSubmit={handleSubmit}>
                        <div className='form-row'>
                            <div className='form-group'>
                                <label htmlFor='fullName'>
                                    Nombre completo
                                </label>
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
                                    onChange={(e) => setCompany(e.target.value)}
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
                                <label htmlFor='phone'>Teléfono</label>
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
                            <label htmlFor='topic'>Motivo de la consulta</label>
                            <select
                                id='topic'
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            >
                                <option value='general'>
                                    Consulta general
                                </option>
                                <option value='company'>
                                    Estudio de seguridad para empresa
                                </option>
                                <option value='community'>
                                    Seguridad para comunidad / garaje
                                </option>
                                <option value='home'>
                                    Seguridad para vivienda
                                </option>
                                <option value='callback'>
                                    Quiero que me llaméis
                                </option>
                            </select>
                        </div>

                        <div className='form-group'>
                            <label htmlFor='message'>
                                Cuéntanos qué necesitas
                            </label>
                            <textarea
                                id='message'
                                rows='4'
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder='Describe brevemente tu situación, horarios, tipo de instalación…'
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
                                    He leído y acepto la política de privacidad.
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

export default Consulting;
