import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    fetchPublicClientDocumentationDraft,
    savePublicClientDocumentationDraft,
} from '../../services/employeeDocumentationService.js';
import '../../components/employeeDocumentation/EmployeeDocumentationComponent.css';

const clientFileFields = [
    ['acceptedBudgetPath', 'Presupuesto aceptado'],
    ['serviceContractPath', 'Contrato de prestacion del servicio'],
];

const emptyForm = {
    displayName: '',
    taxId: '',
    phone: '',
    email: '',
    contactPerson: '',
    authorizations: '',
    paymentMethod: '',
};

const ClientDocumentationPublic = () => {
    const { token } = useParams();
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await fetchPublicClientDocumentationDraft(token);
            setForm({ ...emptyForm, ...data });
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
            await savePublicClientDocumentationDraft({
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
                    <h2>Ficha de cliente SYUSO</h2>
                    <p>Completa los datos contractuales y adjunta los PDF.</p>
                </div>
            </header>

            <form className='employee-documentation-form' onSubmit={handleSubmit}>
                <div className='employee-documentation-grid'>
                    {[
                        ['displayName', 'Nombre y apellidos / razon social'],
                        ['taxId', 'DNI/NIE/CIF'],
                        ['phone', 'Telefono de contacto'],
                        ['email', 'Correo electronico'],
                        ['contactPerson', 'Persona responsable/contacto'],
                        ['paymentMethod', 'Metodo de pago'],
                    ].map(([field, label]) => (
                        <div key={field} className='employee-documentation-field'>
                            <label>{label}</label>
                            <input
                                type={field === 'email' ? 'email' : 'text'}
                                value={form[field] || ''}
                                onChange={(event) =>
                                    handleChange(field, event.target.value)
                                }
                                required={field === 'displayName' || field === 'email'}
                            />
                        </div>
                    ))}
                    <div className='employee-documentation-field employee-documentation-field--wide'>
                        <label>Autorizaciones necesarias</label>
                        <textarea
                            rows='3'
                            value={form.authorizations || ''}
                            onChange={(event) =>
                                handleChange('authorizations', event.target.value)
                            }
                        />
                    </div>
                </div>

                <div className='employee-documentation-files'>
                    {clientFileFields.map(([field, label]) => (
                        <div key={field} className='employee-documentation-file'>
                            <span>{label}</span>
                            <input
                                type='file'
                                accept='application/pdf'
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

export default ClientDocumentationPublic;
