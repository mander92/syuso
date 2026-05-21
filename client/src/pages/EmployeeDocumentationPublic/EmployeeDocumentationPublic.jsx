import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    fetchPublicDocumentationDraft,
    savePublicDocumentationDraft,
} from '../../services/employeeDocumentationService.js';
import '../../components/employeeDocumentation/EmployeeDocumentationComponent.css';

const fileFields = [
    ['dniFrontPath', 'DNI anverso'],
    ['dniBackPath', 'DNI reverso'],
    ['tipFrontPath', 'TIP anverso'],
    ['tipBackPath', 'TIP reverso'],
];

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    dni: '',
    birthDate: '',
    bankAccount: '',
    address: '',
    phone: '',
    socialSecurityNumber: '',
};

const toDateInput = (value) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const EmployeeDocumentationPublic = () => {
    const { token } = useParams();
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await fetchPublicDocumentationDraft(token);
            setForm({
                ...emptyForm,
                ...data,
                birthDate: toDateInput(data.birthDate),
            });
            setLoading(false);
        };

        load().catch((error) => {
            setLoading(false);
            alert(error.message || 'Enlace no valido');
        });
    }, [token]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await savePublicDocumentationDraft({
                token,
                data: form,
                files,
            });
            setFiles({});
            setSaved(true);
        } catch (error) {
            alert(error.message || 'No se pudo guardar la ficha');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Cargando ficha...</p>;
    if (saved) {
        return (
            <section className='employee-documentation'>
                <header className='employee-documentation-header'>
                    <div>
                        <h2>Ficha enviada</h2>
                        <p>Gracias. SYUSO revisara la documentacion.</p>
                    </div>
                </header>
            </section>
        );
    }

    return (
        <section className='employee-documentation'>
            <header className='employee-documentation-header'>
                <div>
                    <h2>Ficha de alta SYUSO</h2>
                    <p>
                        Completa tus datos y sube las imagenes de DNI y TIP.
                    </p>
                </div>
            </header>

            <form className='employee-documentation-form' onSubmit={handleSubmit}>
                <div className='employee-documentation-grid'>
                    {[
                        ['firstName', 'Nombre'],
                        ['lastName', 'Apellidos'],
                        ['email', 'Email'],
                        ['dni', 'DNI'],
                        ['birthDate', 'Fecha de nacimiento'],
                        ['bankAccount', 'Numero de cuenta bancaria'],
                        ['socialSecurityNumber', 'Numero Seguridad Social'],
                        ['phone', 'Telefono'],
                    ].map(([field, label]) => (
                        <div key={field} className='employee-documentation-field'>
                            <label>{label}</label>
                            <input
                                type={field === 'birthDate' ? 'date' : 'text'}
                                value={form[field] || ''}
                                onChange={(event) =>
                                    handleChange(field, event.target.value)
                                }
                                required={[
                                    'firstName',
                                    'lastName',
                                    'email',
                                    'dni',
                                    'phone',
                                ].includes(field)}
                            />
                        </div>
                    ))}
                    <div className='employee-documentation-field employee-documentation-field--wide'>
                        <label>Direccion</label>
                        <input
                            value={form.address || ''}
                            onChange={(event) =>
                                handleChange('address', event.target.value)
                            }
                        />
                    </div>
                </div>

                <div className='employee-documentation-files'>
                    {fileFields.map(([field, label]) => (
                        <div key={field} className='employee-documentation-file'>
                            <span>{label}</span>
                            <input
                                type='file'
                                accept='image/png,image/jpeg,image/webp'
                                onChange={(event) =>
                                    setFiles((prev) => ({
                                        ...prev,
                                        [field]: event.target.files?.[0],
                                    }))
                                }
                            />
                        </div>
                    ))}
                </div>

                <div className='employee-documentation-actions'>
                    <button
                        type='submit'
                        className='employee-documentation-btn'
                        disabled={saving}
                    >
                        {saving ? 'Enviando...' : 'Enviar ficha'}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default EmployeeDocumentationPublic;
