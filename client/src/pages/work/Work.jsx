import { useState } from 'react';
import toast from 'react-hot-toast';
import './Work.css';
import Button from '../../components/button/button';
import { sendJobApplicationService } from '../../services/jobService';

const Work = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setPhone('');
        setMessage('');
        setCvFile(null);
        // si quieres, podrías usar una ref para vaciar el input file también
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];

        if (!file) {
            setCvFile(null);
            return;
        }

        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Formato no válido. Adjunta un PDF o Word.');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo es demasiado grande (máx. 5MB).');
            e.target.value = '';
            return;
        }

        setCvFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!cvFile) {
            toast.error('Por favor, adjunta tu CV.');
            return;
        }

        try {
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('message', message);
            formData.append('cv', cvFile); // 👈 'cv' tiene que coincidir con req.files.cv

            const data = await sendJobApplicationService(formData);

            console.log('Candidatura ID:', data.id);

            toast.success(
                'Hemos recibido tu candidatura. Nos pondremos en contacto contigo si tu perfil encaja.'
            );
            resetForm();
        } catch (err) {
            toast.error(err.message || 'No se ha podido enviar tu candidatura');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='work-wrapper'>
            <div className='work-layout'>
                {/* Texto lateral */}
                <section className='work-info'>
                    <h1>Trabaja con SYUSO Seguridad</h1>
                    <p className='work-subtitle'>
                        Si tienes experiencia en el sector de la seguridad,
                        vigilancia o sistemas, nos encantará conocer tu perfil.
                    </p>

                    <ul className='work-list'>
                        <li>Vigilantes de seguridad habilitados</li>
                        <li>Operadores de CRA / monitoreo</li>
                        <li>Técnicos de sistemas de seguridad</li>
                        <li>Perfiles de coordinación y administración</li>
                    </ul>

                    <p className='work-note'>
                        Adjunta tu CV actualizado y cuéntanos en qué tipo de
                        puesto te gustaría trabajar.
                    </p>
                </section>

                {/* Formulario */}
                <section className='work-form-section'>
                    <form className='work-form' onSubmit={handleSubmit}>
                        <h2>Envíanos tu CV</h2>

                        <div className='form-group'>
                            <label htmlFor='fullName'>Nombre completo</label>
                            <input
                                id='fullName'
                                type='text'
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder='Tu nombre y apellidos'
                                required
                            />
                        </div>

                        <div className='form-group'>
                            <label htmlFor='email'>Email</label>
                            <input
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder='correo@ejemplo.com'
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

                        <div className='form-group'>
                            <label htmlFor='message'>
                                Cuéntanos brevemente tu perfil (opcional)
                            </label>
                            <textarea
                                id='message'
                                rows='4'
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder='Ej: 5 años de experiencia como vigilante, disponibilidad para turnos rotativos...'
                            />
                        </div>

                        <div className='form-group'>
                            <label htmlFor='cv'>
                                Adjuntar CV (PDF o Word, máx. 5MB)
                            </label>
                            <input
                                id='cv'
                                type='file'
                                accept='.pdf,.doc,.docx'
                                onChange={handleFileChange}
                                required
                            />
                        </div>

                        <div className='work-form-actions'>
                            <Button
                                variant='btn btn-secondary'
                                type='button'
                                onClick={resetForm}
                                disabled={isSubmitting}
                            >
                                Limpiar formulario
                            </Button>

                            <Button
                                variant='btn btn-primary'
                                type='submit'
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? 'Enviando candidatura...'
                                    : 'Enviar candidatura'}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Work;
