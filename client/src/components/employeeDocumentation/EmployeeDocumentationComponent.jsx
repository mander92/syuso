import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEmployeeDocumentation,
    fetchEmployeeDocumentations,
    fetchMyEmployeeDocumentation,
    openEmployeeDocumentationFile,
    saveEmployeeDocumentation,
} from '../../services/employeeDocumentationService.js';
import './EmployeeDocumentationComponent.css';

const fileFields = [
    ['dniFrontPath', 'DNI anverso'],
    ['dniBackPath', 'DNI reverso'],
    ['tipFrontPath', 'TIP anverso'],
    ['tipBackPath', 'TIP reverso'],
];

const statusLabels = {
    pending: 'Pendiente',
    submitted: 'Enviada',
    reviewed: 'Revisada',
    rejected: 'Rechazada',
};

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    bankAccount: '',
    address: '',
    phone: '',
    socialSecurityNumber: '',
    status: 'pending',
    reviewNotes: '',
};

const toDateInput = (value) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const normalizeDocumentation = (data) => ({
    ...emptyForm,
    ...data,
    phone: data?.phone || data?.userPhone || '',
    birthDate: toDateInput(data?.birthDate),
    status: data?.status || 'pending',
});

const EmployeeDocumentationComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';
    const [items, setItems] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const selectedItem = useMemo(
        () =>
            isAdminLike
                ? items.find((item) => item.userId === selectedUserId)
                : form,
        [form, isAdminLike, items, selectedUserId]
    );

    const load = async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            if (isAdminLike) {
                const data = await fetchEmployeeDocumentations(authToken);
                setItems(data || []);
                const firstId = data?.[0]?.userId || '';
                setSelectedUserId((prev) => prev || firstId);
                if (firstId && !selectedUserId) {
                    setForm(normalizeDocumentation(data[0]));
                }
            } else {
                const data = await fetchMyEmployeeDocumentation(authToken);
                setForm(normalizeDocumentation(data));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch((error) => alert(error.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, isAdminLike]);

    const selectEmployee = async (userId) => {
        setSelectedUserId(userId);
        setFiles({});
        const data = await fetchEmployeeDocumentation(authToken, userId);
        setForm(normalizeDocumentation(data));
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                birthDate: form.birthDate,
                bankAccount: form.bankAccount,
                address: form.address,
                phone: form.phone,
                socialSecurityNumber: form.socialSecurityNumber,
                status: form.status,
                reviewNotes: form.reviewNotes,
            };
            const data = await saveEmployeeDocumentation({
                authToken,
                userId: isAdminLike ? selectedUserId : null,
                data: payload,
                files,
            });
            setForm(normalizeDocumentation(data));
            setFiles({});
            if (isAdminLike) {
                const list = await fetchEmployeeDocumentations(authToken);
                setItems(list || []);
            }
            alert('Ficha guardada correctamente.');
        } catch (error) {
            alert(error.message || 'Error guardando documentacion');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenFile = async (field) => {
        try {
            await openEmployeeDocumentationFile({
                authToken,
                userId: isAdminLike ? selectedUserId : user.id,
                field,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    if (loading) {
        return <p>Cargando documentacion...</p>;
    }

    return (
        <section className='employee-documentation'>
            <header className='employee-documentation-header'>
                <div>
                    <h2>Documentacion de trabajadores</h2>
                    <p>
                        Gestiona la ficha documental y las imagenes de DNI/TIP.
                    </p>
                </div>
            </header>

            <div className='employee-documentation-layout'>
                {isAdminLike ? (
                    <aside className='employee-documentation-list'>
                        {items.map((item) => (
                            <button
                                key={item.userId}
                                type='button'
                                className={
                                    item.userId === selectedUserId
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    selectEmployee(item.userId).catch((error) =>
                                        alert(error.message)
                                    )
                                }
                            >
                                <span>
                                    {item.firstName} {item.lastName}
                                </span>
                                <span className='employee-documentation-status'>
                                    {statusLabels[item.status || 'pending']}
                                </span>
                            </button>
                        ))}
                    </aside>
                ) : null}

                <form
                    className='employee-documentation-form'
                    onSubmit={handleSubmit}
                >
                    <div className='employee-documentation-grid'>
                        <div className='employee-documentation-field'>
                            <label>Nombre</label>
                            <input value={form.firstName || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Apellidos</label>
                            <input value={form.lastName || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Email</label>
                            <input value={form.email || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Fecha de nacimiento</label>
                            <input
                                type='date'
                                value={form.birthDate || ''}
                                onChange={(event) =>
                                    handleChange('birthDate', event.target.value)
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Numero de cuenta bancaria</label>
                            <input
                                value={form.bankAccount || ''}
                                onChange={(event) =>
                                    handleChange('bankAccount', event.target.value)
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Numero Seguridad Social</label>
                            <input
                                value={form.socialSecurityNumber || ''}
                                onChange={(event) =>
                                    handleChange(
                                        'socialSecurityNumber',
                                        event.target.value
                                    )
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Telefono</label>
                            <input
                                value={form.phone || ''}
                                onChange={(event) =>
                                    handleChange('phone', event.target.value)
                                }
                            />
                        </div>
                        {isAdminLike ? (
                            <div className='employee-documentation-field'>
                                <label>Estado</label>
                                <select
                                    value={form.status || 'pending'}
                                    onChange={(event) =>
                                        handleChange('status', event.target.value)
                                    }
                                >
                                    <option value='pending'>Pendiente</option>
                                    <option value='submitted'>Enviada</option>
                                    <option value='reviewed'>Revisada</option>
                                    <option value='rejected'>Rechazada</option>
                                </select>
                            </div>
                        ) : null}
                        <div className='employee-documentation-field employee-documentation-field--wide'>
                            <label>Direccion</label>
                            <input
                                value={form.address || ''}
                                onChange={(event) =>
                                    handleChange('address', event.target.value)
                                }
                            />
                        </div>
                        {isAdminLike ? (
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Notas internas</label>
                                <textarea
                                    rows='3'
                                    value={form.reviewNotes || ''}
                                    onChange={(event) =>
                                        handleChange(
                                            'reviewNotes',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className='employee-documentation-files'>
                        {fileFields.map(([field, label]) => (
                            <div
                                key={field}
                                className='employee-documentation-file'
                            >
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
                                <div className='employee-documentation-file-actions'>
                                    {selectedItem?.[field] ? (
                                        <button
                                            type='button'
                                            className='employee-documentation-btn employee-documentation-btn--ghost'
                                            onClick={() => handleOpenFile(field)}
                                        >
                                            Ver archivo
                                        </button>
                                    ) : (
                                        <span>Sin archivo</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='employee-documentation-actions'>
                        <button
                            type='submit'
                            className='employee-documentation-btn'
                            disabled={saving || (isAdminLike && !selectedUserId)}
                        >
                            {saving ? 'Guardando...' : 'Guardar ficha'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default EmployeeDocumentationComponent;
