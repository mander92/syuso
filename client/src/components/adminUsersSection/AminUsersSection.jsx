// src/components/AdminUsersSection.jsx
import { Fragment, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllUsersServices,
    fetchAdminUpdateUserServices,
    fetchSendRecoverPasswordUserServices,
    fetchRegisterAdminUserServices,
} from '../../services/userService.js';
import {
    createDelegation,
    fetchDelegations,
    fetchUserDelegations,
    updateDelegation,
    deleteDelegation,
} from '../../services/delegationService.js';
import './AdminUsersSection.css';

const AdminUsersSection = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isSudo = user?.role === 'sudo';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [delegations, setDelegations] = useState([]);
    const [newDelegationName, setNewDelegationName] = useState('');
    const [newUserDelegations, setNewUserDelegations] = useState([]);
    const [editingDelegations, setEditingDelegations] = useState([]);
    const [editingDelegationId, setEditingDelegationId] = useState('');
    const [editingDelegationName, setEditingDelegationName] = useState('');
    const [creatingDelegation, setCreatingDelegation] = useState(false);

    // Filtros que van al BACK (job, active, city, role)
    const [filterRole, setFilterRole] = useState('all');
    const [filterCity, setFilterCity] = useState('');
    // Lo llamas "job" en el front y probablemente "job" o "position" en el back
    const [filterJob, setFilterJob] = useState('');
    const [filterActive, setFilterActive] = useState('1');
    const [filterDelegation, setFilterDelegation] = useState('');

    // Búsqueda local (front)
    const [search, setSearch] = useState('');

    // Edición
    const [editingUser, setEditingUser] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [actionUser, setActionUser] = useState(null);
    const [expandedUserId, setExpandedUserId] = useState(null);

    // Crear usuario nuevo
    const [creating, setCreating] = useState(false);
    const [savingNew, setSavingNew] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        firstName: '',
        lastName: '',
        dni: '',
        phone: '',
        city: '',
        job: '',
        role: 'client',
    });

    // ===============================
    // Helpers
    // ===============================

    const isUserActive = (activeValue) =>
        activeValue === 1 || activeValue === true || activeValue === '1';

    // ===============================
    // Cargar usuarios desde el backend con filtros
    // ===============================
    const loadUsers = async () => {
        try {
            if (!authToken) return;

            setLoading(true);

            const params = new URLSearchParams();

            if (filterRole !== 'all' && (isSudo || filterRole !== 'sudo')) {
                params.append('role', filterRole);
            }

            if (filterCity.trim()) {
                params.append('city', filterCity.trim());
            }

            if (filterJob.trim()) {
                params.append('job', filterJob.trim());
            }

            if (filterActive !== 'all') {
                params.append('active', filterActive); // "1" o "0"
            }
            if (filterDelegation) {
                params.append('delegationId', filterDelegation);
            }

            const data = await fetchAllUsersServices(
                params.toString(),
                authToken
            );

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data.users)
                  ? data.users
                  : [];

            setUsers(list);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error cargando usuarios');
        } finally {
            setLoading(false);
        }
    };

    const loadDelegations = async () => {
        try {
            if (!authToken) return;
            const data = await fetchDelegations(authToken);
            setDelegations(data);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error cargando delegaciones');
        }
    };

    useEffect(() => {
        if (authToken) loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

    useEffect(() => {
        if (authToken) loadDelegations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

    useEffect(() => {
        if (authToken) loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterRole, filterCity, filterJob, filterActive, filterDelegation]);

    const handleClearFilters = () => {
        setFilterRole('all');
        setFilterCity('');
        setFilterJob('');
        setFilterDelegation('');
        setFilterActive('1');
        setSearch('');
    };

    // ===============================
    // Búsqueda local (nombre/email/DNI)
    // ===============================
    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;

        const term = search.toLowerCase();

        return users.filter((u) => {
            const fullName =
                `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
            return (
                fullName.includes(term) ||
                (u.email || '').toLowerCase().includes(term) ||
                (u.dni || '').toLowerCase().includes(term)
            );
        });
    }, [users, search]);

    // ===============================
    // Acciones: rol, activo, borrar, reset pass
    // ===============================
    const handleChangeRole = async (userId, newRole) => {
        try {
            if (!authToken) return;

            await fetchAdminUpdateUserServices(authToken, userId, {
                role: newRole,
            });

            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
            );
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error cambiando rol');
        }
    };

    const handleToggleActive = async (userId, currentActive) => {
        try {
            if (!authToken) return;

            const newActive = isUserActive(currentActive) ? 0 : 1;

            await fetchAdminUpdateUserServices(authToken, userId, {
                active: newActive,
            });

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId ? { ...u, active: newActive } : u
                )
            );
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error cambiando estado');
        }
    };

    const handleResetPassword = async (user) => {
        if (
            !window.confirm(
                `Se enviará un email de recuperación de contraseña a ${user.email}. ¿Continuar?`
            )
        ) {
            return;
        }

        try {
            await fetchSendRecoverPasswordUserServices(user.email);
            alert('Se ha enviado el email de reseteo de contraseña.');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error enviando email de reseteo');
        }
    };

    // ===============================
    // Edición inline
    // ===============================
    const startEditUser = (user) => {
        setEditingUser({
            ...user,
            phone: user.phone ?? '',
            dni: user.dni ?? '',
            city: user.city ?? '',
            job: user.job ?? '',
        });

        if (isSudo && user.role === 'admin') {
            fetchUserDelegations(authToken, user.id)
                .then((data) => {
                    setEditingDelegations(data.map((item) => item.id));
                })
                .catch((error) => {
                    console.error(error);
                    alert(
                        error.message ||
                            'Error cargando delegaciones del admin'
                    );
                });
        } else {
            setEditingDelegations([]);
        }
    };

    const handleEditChange = (field, value) => {
        setEditingUser((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingUser || !authToken) return;

        setSavingEdit(true);
        try {
            const { id, firstName, lastName, phone, dni, city, job } =
                editingUser;

            const payload = {};

            if (firstName != null && firstName.trim() !== '') {
                payload.firstName = firstName.trim();
            }
            if (lastName != null && lastName.trim() !== '') {
                payload.lastName = lastName.trim();
            }
            if (phone != null && String(phone).trim() !== '') {
                payload.phone = String(phone).trim();
            }
            if (dni != null && dni.trim() !== '') {
                payload.dni = dni.trim();
            }
            if (city != null && city.trim() !== '') {
                payload.city = city.trim();
            }
            if (job != null && job.trim() !== '') {
                payload.job = job.trim();
            }

            if (isSudo && editingUser.role === 'admin') {
                payload.delegationIds = editingDelegations;
            }

            if (Object.keys(payload).length === 0) {
                alert('No hay cambios para guardar');
                setSavingEdit(false);
                return;
            }

            await fetchAdminUpdateUserServices(authToken, id, payload);

            setUsers((prev) =>
                prev.map((u) => (u.id === id ? { ...u, ...editingUser } : u))
            );
            setEditingUser(null);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error guardando cambios');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditingDelegations([]);
    };

    const closeActionModal = () => {
        setActionUser(null);
    };

    // ===============================
    // Crear usuario nuevo (ADMIN)
    // ===============================
    const handleNewUserChange = (field, value) => {
        setNewUser((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (field === 'role' && value !== 'admin') {
            setNewUserDelegations([]);
        }
    };

    const handleDelegationSelect = (event, setter) => {
        const values = Array.from(event.target.selectedOptions).map(
            (option) => option.value
        );
        setter(values);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        try {
            setSavingNew(true);

            const { email, firstName, lastName, dni, phone, job, city, role } =
                newUser;

            if (!email || !firstName || !lastName || !dni || !phone) {
                alert(
                    'Email, nombre, apellidos, DNI y telefono son obligatorios.'
                );
                setSavingNew(false);
                return;
            }

            if (isSudo && role === 'admin' && newUserDelegations.length === 0) {
                alert('Selecciona al menos una delegacion para el admin.');
                setSavingNew(false);
                return;
            }

            if (!authToken) {
                alert('Sesión no válida');
                setSavingNew(false);
                return;
            }

            await fetchRegisterAdminUserServices(
                email,
                firstName,
                lastName,
                dni,
                phone,
                job,
                city,
                role,
                role === 'admin' ? newUserDelegations : [],
                authToken
            );

            alert(
                'Usuario creado correctamente. Se ha enviado un email con sus credenciales.'
            );

            setNewUser({
                email: '',
                firstName: '',
                lastName: '',
                dni: '',
                phone: '',
                city: '',
                job: '',
                role: 'client',
            });
            setNewUserDelegations([]);

            setCreating(false);
            await loadUsers();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error creando usuario');
        } finally {
            setSavingNew(false);
        }
    };

    const handleCreateDelegation = async (e) => {
        e.preventDefault();
        if (!newDelegationName.trim()) return;

        try {
            const data = await createDelegation(
                authToken,
                newDelegationName.trim()
            );
            setDelegations((prev) => [...prev, data]);
            setNewDelegationName('');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error creando delegacion');
        }
    };

    const handleEditDelegation = (delegation) => {
        setEditingDelegationId(delegation.id);
        setEditingDelegationName(delegation.name);
    };

    const handleCancelDelegationEdit = () => {
        setEditingDelegationId('');
        setEditingDelegationName('');
    };

    const handleSaveDelegation = async (delegationId) => {
        if (!editingDelegationName.trim()) return;
        try {
            await updateDelegation(
                authToken,
                delegationId,
                editingDelegationName.trim()
            );
            await loadDelegations();
            setEditingDelegationId('');
            setEditingDelegationName('');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error actualizando delegacion');
        }
    };

    const handleDeleteDelegation = async (delegationId) => {
        if (!window.confirm('?Eliminar esta delegacion?')) return;
        try {
            await deleteDelegation(authToken, delegationId);
            await loadDelegations();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error eliminando delegacion');
        }
    };

    // ===============================
    // RENDER
    // ===============================
    return (
        <section className='admin-users-wrapper'>
            <div className='admin-users-header'>
                <div>
                    <h1 className='admin-users-title'>Usuarios</h1>
                    <p className='admin-users-subtitle'>
                        Gestiona administradores, clientes y empleados.
                    </p>
                </div>

                {/* Filtros */}
                <div className='admin-users-filters'>
                    <div className='admin-users-filter'>
                        <label htmlFor='roleFilter'>Rol</label>
                        <select
                            id='roleFilter'
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value='all'>Todos</option>
                            {isSudo && <option value='sudo'>Sudo</option>}
                            {isSudo && <option value='admin'>Admin</option>}
                            {!isSudo && <option value='admin'>Admin</option>}
                            <option value='client'>Client</option>
                            <option value='employee'>Employee</option>
                        </select>
                    </div>

                    <div className='admin-users-filter'>
                        <label htmlFor='filterCity'>Delegacion</label>
                        <input
                            id='filterCity'
                            type='text'
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                        />
                    </div>

                    <div className='admin-users-filter'>
                        <label htmlFor='filterJob'>Trabajo</label>
                        <input
                            id='filterJob'
                            type='text'
                            value={filterJob}
                            onChange={(e) => setFilterJob(e.target.value)}
                        />
                    </div>
                    {(user?.role === 'admin' || user?.role === 'sudo') && (
                        <div className='admin-users-filter'>
                            <label htmlFor='filterDelegation'>
                                Delegacion
                            </label>
                            <select
                                id='filterDelegation'
                                value={filterDelegation}
                                onChange={(e) =>
                                    setFilterDelegation(e.target.value)
                                }
                            >
                                <option value=''>Todas</option>
                                {delegations.map((delegation) => (
                                    <option
                                        key={delegation.id}
                                        value={delegation.id}
                                    >
                                        {delegation.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className='admin-users-filter'>
                        <label htmlFor='filterActive'>Estado</label>
                        <select
                            id='filterActive'
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                        >
                            <option value='all'>Todos</option>
                            <option value='1'>Activos</option>
                            <option value='0'>Inactivos</option>
                        </select>
                    </div>

                    <div className='admin-users-filter'>
                        <label htmlFor='searchUser'>Buscar</label>
                        <input
                            id='searchUser'
                            type='text'
                            placeholder='Nombre, email o DNI'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button
                        type='button'
                        className='admin-users-btn admin-users-btn--ghost'
                        style={{ alignSelf: 'flex-end' }}
                        onClick={handleClearFilters}
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {isSudo && (
                <div className='admin-users-card'>
                    <div className='admin-users-create-header'>
                        <h2>Delegaciones</h2>
                        <button
                            type='button'
                            className='admin-users-add-btn'
                            onClick={() =>
                                setCreatingDelegation((prev) => !prev)
                            }
                            title={
                                creatingDelegation
                                    ? 'Cerrar'
                                    : 'Agregar delegacion'
                            }
                            aria-label={
                                creatingDelegation
                                    ? 'Cerrar formulario'
                                    : 'Abrir formulario'
                            }
                        >
                            {creatingDelegation ? 'X' : '+'}
                        </button>
                    </div>

                    {creatingDelegation && (
                        <div className='admin-users-delegations-panel'>
                            <form
                                className='admin-users-edit-form'
                                onSubmit={handleCreateDelegation}
                            >
                                <div className='admin-users-edit-grid'>
                                    <div className='admin-users-edit-field'>
                                        <label htmlFor='newDelegation'>
                                            Nueva delegacion
                                        </label>
                                        <input
                                            id='newDelegation'
                                            type='text'
                                            value={newDelegationName}
                                            onChange={(e) =>
                                                setNewDelegationName(
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className='admin-users-edit-actions'>
                                    <button
                                        type='button'
                                        className='admin-users-btn admin-users-btn--ghost'
                                        onClick={() =>
                                            setCreatingDelegation(false)
                                        }
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type='submit'
                                        className='admin-users-btn'
                                        disabled={!newDelegationName.trim()}
                                    >
                                        Agregar delegacion
                                    </button>
                                </div>
                            </form>

                            <div className='admin-users-delegations-list'>
                                {delegations.length ? (
                                    delegations.map((delegation) => {
                                        const isEditing =
                                            editingDelegationId ===
                                            delegation.id;
                                        return (
                                            <div
                                                key={delegation.id}
                                                className='admin-users-delegation-item'
                                            >
                                                {isEditing ? (
                                                    <>
                                                        <input
                                                            type='text'
                                                            value={
                                                                editingDelegationName
                                                            }
                                                            onChange={(e) =>
                                                                setEditingDelegationName(
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                        <div className='admin-users-delegation-actions'>
                                                            <button
                                                                type='button'
                                                                className='admin-users-btn'
                                                                onClick={() =>
                                                                    handleSaveDelegation(
                                                                        delegation.id
                                                                    )
                                                                }
                                                            >
                                                                Guardar
                                                            </button>
                                                            <button
                                                                type='button'
                                                                className='admin-users-btn admin-users-btn--ghost'
                                                                onClick={
                                                                    handleCancelDelegationEdit
                                                                }
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>
                                                            {delegation.name}
                                                        </span>
                                                        <div className='admin-users-delegation-actions'>
                                                            <button
                                                                type='button'
                                                                className='admin-users-btn admin-users-btn--ghost'
                                                                onClick={() =>
                                                                    handleEditDelegation(
                                                                        delegation
                                                                    )
                                                                }
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                type='button'
                                                                className='admin-users-btn admin-users-btn--danger'
                                                                onClick={() =>
                                                                    handleDeleteDelegation(
                                                                        delegation.id
                                                                    )
                                                                }
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className='admin-users-empty'>
                                        No hay delegaciones.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bloque para crear nuevo usuario */}
            <div className='admin-users-card'>
                <div className='admin-users-create-header'>
                    <h2>Crear nuevo usuario</h2>
                    <button
                        type='button'
                        className='admin-users-add-btn'
                        onClick={() => setCreating((prev) => !prev)}
                        title={creating ? 'Cerrar' : 'Añadir usuario'}
                        aria-label={
                            creating ? 'Cerrar formulario' : 'Abrir formulario'
                        }
                    >
                        {creating ? 'X' : '+'}
                    </button>
                </div>

                {creating && (
                    <form
                        className='admin-users-edit-form'
                        onSubmit={handleCreateUser}
                    >
                        <div className='admin-users-edit-grid'>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newEmail'>Email</label>
                                <input
                                    id='newEmail'
                                    type='email'
                                    value={newUser.email}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'email',
                                            e.target.value
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newFirstName'>Nombre</label>
                                <input
                                    id='newFirstName'
                                    type='text'
                                    value={newUser.firstName}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'firstName',
                                            e.target.value
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newLastName'>Apellidos</label>
                                <input
                                    id='newLastName'
                                    type='text'
                                    value={newUser.lastName}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'lastName',
                                            e.target.value
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newDni'>DNI</label>
                                <input
                                    id='newDni'
                                    type='text'
                                    value={newUser.dni}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'dni',
                                            e.target.value
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newPhone'>Teléfono</label>
                                <input
                                    id='newPhone'
                                    type='text'
                                    value={newUser.phone}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'phone',
                                            e.target.value
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newCity'>Ciudad</label>
                                <input
                                    id='newCity'
                                    type='text'
                                    value={newUser.city}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'city',
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                            {newUser.role !== 'admin' &&
                                newUser.role !== 'sudo' && (
                                    <div className='admin-users-edit-field'>
                                        <label htmlFor='newDelegation'>
                                            Delegacion
                                        </label>
                                        <select
                                            id='newDelegation'
                                            value={newUser.city}
                                            onChange={(e) =>
                                                handleNewUserChange(
                                                    'city',
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value=''>
                                                Seleccionar delegacion
                                            </option>
                                            {delegations.map((delegation) => (
                                                <option
                                                    key={delegation.id}
                                                    value={delegation.name}
                                                >
                                                    {delegation.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newJob'>Trabajo</label>
                                <input
                                    id='newJob'
                                    type='text'
                                    value={newUser.job}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'job',
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                            <div className='admin-users-edit-field'>
                                <label htmlFor='newRole'>Rol</label>
                                <select
                                    id='newRole'
                                    value={newUser.role}
                                    onChange={(e) =>
                                        handleNewUserChange(
                                            'role',
                                            e.target.value
                                        )
                                    }
                                >
                                    {isSudo && (
                                        <option value='sudo'>Sudo</option>
                                    )}
                                    {isSudo && (
                                        <option value='admin'>Admin</option>
                                    )}
                                    <option value='client'>Client</option>
                                    <option value='employee'>Employee</option>
                                </select>
                            </div>
                            {isSudo && newUser.role === 'admin' && (
                                <div className='admin-users-edit-field admin-users-delegations-field'>
                                    <label>Delegaciones</label>
                                    <select
                                        multiple
                                        className='admin-users-delegations-select'
                                        value={newUserDelegations}
                                        onChange={(event) =>
                                            handleDelegationSelect(
                                                event,
                                                setNewUserDelegations
                                            )
                                        }
                                    >
                                        {delegations.map((delegation) => (
                                            <option
                                                key={delegation.id}
                                                value={delegation.id}
                                            >
                                                {delegation.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className='admin-users-edit-actions'>
                            <button
                                type='button'
                                className='admin-users-btn admin-users-btn--ghost'
                                onClick={() => setCreating(false)}
                                disabled={savingNew}
                            >
                                Cancelar
                            </button>
                            <button
                                type='submit'
                                className='admin-users-btn'
                                disabled={savingNew}
                            >
                                {savingNew ? 'Creando...' : 'Crear usuario'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Tabla de usuarios con edición inline */}
            <div className='admin-users-card'>
                {loading ? (
                    <p className='admin-users-loading'>Cargando usuarios...</p>
                ) : filteredUsers.length === 0 ? (
                    <p className='admin-users-empty'>
                        No se han encontrado usuarios con los filtros actuales.
                    </p>
                ) : (
                    <div className='admin-users-table-wrapper'>
                        <table className='admin-users-table'>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Teléfono</th>
                                    <th>DNI</th>
                                    <th>Delegacion / Trabajo</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => {
                                    const active = isUserActive(u.active);
                                    const isEditing =
                                        editingUser && editingUser.id === u.id;

                                    return (
                                        <Fragment key={u.id}>
                                            <tr>
                                                <td data-label='Nombre'>
                                                    {(u.firstName || '') +
                                                        ' ' +
                                                        (u.lastName || '')}
                                                </td>
                                                <td data-label='Email'>
                                                    {u.email}
                                                </td>
                                                <td data-label='Telefono'>
                                                    {u.phone || '-'}
                                                </td>
                                                <td data-label='DNI'>
                                                    {u.dni || '-'}
                                                </td>
                                                <td data-label='Delegacion / Trabajo'>
                                                    {u.delegations || u.city || u.job
                                                        ? `${u.delegations || u.city || ''}${
                                                              (u.delegations || u.city) && u.job
                                                                  ? ' · '
                                                                  : ''
                                                          }${u.job || ''}`
                                                        : '-'}
                                                </td>
                                                <td data-label='Estado'>
                                                    <span
                                                        className={
                                                            'admin-users-status-dot ' +
                                                            (active
                                                                ? 'admin-users-status-dot--active'
                                                                : 'admin-users-status-dot--inactive')
                                                        }
                                                        title={
                                                            active
                                                                ? 'Activo'
                                                                : 'Inactivo'
                                                        }
                                                    />
                                                </td>
                                                <td className='admin-users-mobile-toggle-cell'>
                                                    <button
                                                        type='button'
                                                        className='admin-users-mobile-toggle'
                                                        onClick={() =>
                                                            setExpandedUserId(
                                                                expandedUserId ===
                                                                    u.id
                                                                    ? null
                                                                    : u.id
                                                            )
                                                        }
                                                        aria-label='Mostrar detalles'
                                                    >
                                                        {expandedUserId === u.id
                                                            ? '-'
                                                            : '+'}
                                                    </button>
                                                </td>
                                                <td data-label='Acciones'>
                                                    {u.role !== 'sudo' || isSudo ? (
                                                        <button
                                                            type='button'
                                                            className='admin-users-action-menu'
                                                            onClick={() =>
                                                                setActionUser(u)
                                                            }
                                                            aria-label='Abrir acciones'
                                                        >
                                                            ...
                                                        </button>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                                <td className='admin-users-mobile-extra-cell'>
                                                    {expandedUserId === u.id && (
                                                        <div className='admin-users-mobile-extra'>
                                                            <div>
                                                                {u.email}
                                                            </div>
                                                            <div>
                                                                {u.phone || '-'}
                                                            </div>
                                                            <div>
                                                                {u.delegations ||
                                                                u.city ||
                                                                u.job
                                                                    ? `${u.delegations || u.city || ''}${
                                                                          (u.delegations || u.city) && u.job
                                                                              ? ' · '
                                                                              : ''
                                                                      }${u.job || ''}`
                                                                    : '-'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {isEditing && (
                                                <tr className='admin-users-edit-row'>
                                                    <td colSpan='7'>
                                                        <div className='admin-users-edit-card'>
                                                            <h3>
                                                                Editar usuario
                                                            </h3>
                                                            <form
                                                                onSubmit={
                                                                    handleSaveEdit
                                                                }
                                                                className='admin-users-edit-form'
                                                            >
                                                                <div className='admin-users-edit-grid'>
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editFirstName'>
                                                                            Nombre
                                                                        </label>
                                                                        <input
                                                                            id='editFirstName'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.firstName ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'firstName',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editLastName'>
                                                                            Apellidos
                                                                        </label>
                                                                        <input
                                                                            id='editLastName'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.lastName ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'lastName',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editPhone'>
                                                                            Teléfono
                                                                        </label>
                                                                        <input
                                                                            id='editPhone'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.phone ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'phone',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editDni'>
                                                                            DNI
                                                                        </label>
                                                                        <input
                                                                            id='editDni'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.dni ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'dni',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editCity'>
                                                                            Ciudad
                                                                        </label>
                                                                        <input
                                                                            id='editCity'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.city ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'city',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {editingUser.role !==
                                                                        'admin' &&
                                                                        editingUser.role !==
                                                                            'sudo' && (
                                                                            <div className='admin-users-edit-field'>
                                                                                <label htmlFor='editDelegation'>
                                                                                    Delegacion
                                                                                </label>
                                                                                <select
                                                                                    id='editDelegation'
                                                                                    value={
                                                                                        editingUser.city ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        handleEditChange(
                                                                                            'city',
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <option value=''>
                                                                                        Seleccionar delegacion
                                                                                    </option>
                                                                                    {delegations.map(
                                                                                        (
                                                                                            delegation
                                                                                        ) => (
                                                                                            <option
                                                                                                key={
                                                                                                    delegation.id
                                                                                                }
                                                                                                value={
                                                                                                    delegation.name
                                                                                                }
                                                                                            >
                                                                                                {delegation.name}
                                                                                            </option>
                                                                                        )
                                                                                    )}
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                    <div className='admin-users-edit-field'>
                                                                        <label htmlFor='editJob'>
                                                                            Trabajo
                                                                        </label>
                                                                        <input
                                                                            id='editJob'
                                                                            type='text'
                                                                            value={
                                                                                editingUser.job ||
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                handleEditChange(
                                                                                    'job',
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {isSudo &&
                                                                        editingUser.role ===
                                                                            'admin' && (
                                                                            <div className='admin-users-edit-field admin-users-delegations-field'>
                                                                                <label>
                                                                                    Delegaciones
                                                                                </label>
                                                                                <select
                                                                                    multiple
                                                                                    className='admin-users-delegations-select'
                                                                                    value={
                                                                                        editingDelegations
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        handleDelegationSelect(
                                                                                            event,
                                                                                            setEditingDelegations
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    {delegations.map(
                                                                                        (
                                                                                            delegation
                                                                                        ) => (
                                                                                            <option
                                                                                                key={
                                                                                                    delegation.id
                                                                                                }
                                                                                                value={
                                                                                                    delegation.id
                                                                                                }
                                                                                            >
                                                                                                {delegation.name}
                                                                                            </option>
                                                                                        )
                                                                                    )}
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                </div>

                                                                <div className='admin-users-edit-actions'>
                                                                    <button
                                                                        type='button'
                                                                        className='admin-users-btn admin-users-btn--ghost'
                                                                        onClick={
                                                                            handleCancelEdit
                                                                        }
                                                                        disabled={
                                                                            savingEdit
                                                                        }
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        type='submit'
                                                                        className='admin-users-btn'
                                                                        disabled={
                                                                            savingEdit
                                                                        }
                                                                    >
                                                                        {savingEdit
                                                                            ? 'Guardando...'
                                                                            : 'Guardar cambios'}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {actionUser && (
                <div
                    className='admin-users-modal-overlay'
                    role='presentation'
                    onClick={closeActionModal}
                >
                    <div
                        className='admin-users-modal'
                        role='dialog'
                        aria-modal='true'
                        aria-label='Acciones de usuario'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='admin-users-modal-header'>
                            <div>
                                <h3>Acciones</h3>
                                <p>
                                    {actionUser.firstName || ''}{' '}
                                    {actionUser.lastName || ''}
                                </p>
                            </div>
                            <button
                                type='button'
                                className='admin-users-btn admin-users-btn--ghost'
                                onClick={closeActionModal}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='admin-users-modal-body'>
                            <div className='admin-users-modal-field'>
                                <label htmlFor='actionRoleSelect'>Rol</label>
                                <select
                                    id='actionRoleSelect'
                                    className='admin-users-role-select'
                                    value={actionUser.role}
                                    onChange={(e) => {
                                        const newRole = e.target.value;
                                        handleChangeRole(
                                            actionUser.id,
                                            newRole
                                        );
                                        setActionUser((prev) =>
                                            prev
                                                ? { ...prev, role: newRole }
                                                : prev
                                        );
                                    }}
                                >
                                    {isSudo && (
                                        <option value='sudo'>Sudo</option>
                                    )}
                                    {(isSudo ||
                                        actionUser.role === 'admin') && (
                                        <option value='admin'>Admin</option>
                                    )}
                                    {!isSudo &&
                                        actionUser.role !== 'admin' && (
                                            <option value='admin'>Admin</option>
                                        )}
                                    <option value='client'>Client</option>
                                    <option value='employee'>Employee</option>
                                </select>
                            </div>
                            <div className='admin-users-modal-actions'>
                                <button
                                    type='button'
                                    className='admin-users-btn admin-users-btn--ghost'
                                    onClick={() => {
                                        startEditUser(actionUser);
                                        closeActionModal();
                                    }}
                                >
                                    Editar
                                </button>
                                <button
                                    type='button'
                                    className='admin-users-btn admin-users-btn--ghost'
                                    onClick={() => {
                                        handleToggleActive(
                                            actionUser.id,
                                            actionUser.active
                                        );
                                        closeActionModal();
                                    }}
                                >
                                    {isUserActive(actionUser.active)
                                        ? 'Desactivar'
                                        : 'Activar'}
                                </button>
                                <button
                                    type='button'
                                    className='admin-users-btn admin-users-btn--ghost'
                                    onClick={() => {
                                        handleResetPassword(actionUser);
                                        closeActionModal();
                                    }}
                                >
                                    Reset pass
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AdminUsersSection;
