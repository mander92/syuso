import { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchDetailServiceServices,
    fetchEditServiceServices,
    fetchActiveServiceShifts,
} from '../../services/serviceService.js';
import { fetchUpdateServiceStatus } from '../../services/serviceService.js';
import { fetchDeleteEmployeeService } from '../../services/personAssigned.js';
import ListEmployeeComponent from '../../components/adminServiceSection/listEmployeeComponent/ListEmployeeComponent.jsx';
import ServiceChat from '../../components/serviceChat/ServiceChat.jsx';
import NfcTagsManager from '../../components/nfcTags/NfcTagsManager.jsx';
import './ServiceDetail.css';

const formatDateTime = (value) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha invalida';
    return date.toLocaleString();
};

const ServiceDetail = () => {
    const { serviceId } = useParams();
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [service, setService] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [numberOfPeople, setNumberOfPeople] = useState('');
    const [reportEmails, setReportEmails] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingEmails, setIsSavingEmails] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [statusModal, setStatusModal] = useState({
        open: false,
        targetStatus: '',
    });
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [activeShifts, setActiveShifts] = useState([]);
    const [activeShiftsLoading, setActiveShiftsLoading] = useState(false);
    const [isActiveShiftsVisible, setIsActiveShiftsVisible] = useState(false);

    useEffect(() => {
        const loadService = async () => {
            try {
                setIsLoading(true);
                const data = await fetchDetailServiceServices(
                    serviceId,
                    authToken
                );
                setService(data);
                const rows = Array.isArray(data) ? data : [data];
                const assigned = rows
                    .filter((row) => row?.employeeId)
                    .map((row) => ({
                        id: row.employeeId,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        email: row.email,
                        phone: row.phone,
                        dni: row.dni,
                    }));
                setAssignedEmployees(assigned);
                if (rows[0]?.numberOfPeople != null) {
                    setNumberOfPeople(String(rows[0].numberOfPeople));
                }
                setReportEmails(rows[0]?.reportEmail || '');
            } catch (error) {
                toast.error(error.message || 'No se pudo cargar el servicio', {
                    id: 'service-detail',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (authToken && serviceId) {
            loadService();
        }
    }, [authToken, serviceId]);

    const detail = useMemo(() => {
        if (!service) return null;
        return Array.isArray(service) ? service[0] : service;
    }, [service]);

    const handleUnassign = async (employeeId) => {
        try {
            await fetchDeleteEmployeeService(employeeId, serviceId, authToken);
            setAssignedEmployees((prev) =>
                prev.filter((employee) => employee.id !== employeeId)
            );
            toast.success('Empleado desasignado');
        } catch (error) {
            toast.error(error.message || 'No se pudo desasignar', {
                id: 'service-unassign',
            });
        }
    };

    const handleUpdateCapacity = async (e) => {
        e.preventDefault();

        const normalized = Number(numberOfPeople);
        if (!normalized || Number.isNaN(normalized) || normalized < 1) {
            toast.error('El numero de empleados debe ser valido');
            return;
        }

        try {
            setIsSaving(true);
            const response = await fetchEditServiceServices(
                serviceId,
                { numberOfPeople: normalized },
                authToken
            );
            toast.success(response.message || 'Servicio actualizado');
            setService((prev) => {
                if (!prev) return prev;
                if (Array.isArray(prev)) {
                    return prev.map((row) => ({
                        ...row,
                        numberOfPeople: normalized,
                    }));
                }
                return { ...prev, numberOfPeople: normalized };
            });
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar', {
                id: 'service-update',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCompleteService = async () => {
        if (!serviceId) return;
        try {
            setIsCompleting(true);
            setIsUpdatingStatus(true);
            await fetchUpdateServiceStatus(authToken, serviceId, 'completed');
            setService((prev) => {
                if (!prev) return prev;
                if (Array.isArray(prev)) {
                    return prev.map((row) => ({
                        ...row,
                        status: 'completed',
                    }));
                }
                return { ...prev, status: 'completed' };
            });
            toast.success('Servicio completado');
        } catch (error) {
            toast.error(error.message || 'No se pudo completar', {
                id: 'service-complete',
            });
        } finally {
            setIsCompleting(false);
            setIsUpdatingStatus(false);
            setStatusModal({ open: false, targetStatus: '' });
        }
    };

    const handleReactivateService = async () => {
        if (!serviceId) return;
        try {
            setIsReactivating(true);
            setIsUpdatingStatus(true);
            await fetchUpdateServiceStatus(authToken, serviceId, 'confirmed');
            setService((prev) => {
                if (!prev) return prev;
                if (Array.isArray(prev)) {
                    return prev.map((row) => ({
                        ...row,
                        status: 'confirmed',
                    }));
                }
                return { ...prev, status: 'confirmed' };
            });
            toast.success('Servicio reactivado');
        } catch (error) {
            toast.error(error.message || 'No se pudo reactivar', {
                id: 'service-reactivate',
            });
        } finally {
            setIsReactivating(false);
            setIsUpdatingStatus(false);
            setStatusModal({ open: false, targetStatus: '' });
        }
    };

    const openStatusModal = (targetStatus) => {
        setStatusModal({ open: true, targetStatus });
    };

    const closeStatusModal = () => {
        if (isUpdatingStatus) return;
        setStatusModal({ open: false, targetStatus: '' });
    };

    const handleConfirmStatus = () => {
        if (statusModal.targetStatus === 'completed') {
            handleCompleteService();
            return;
        }

        if (statusModal.targetStatus === 'confirmed') {
            handleReactivateService();
        }
    };

    const handleUpdateReportEmails = async (e) => {
        e.preventDefault();

        try {
            setIsSavingEmails(true);
            const response = await fetchEditServiceServices(
                serviceId,
                { reportEmail: reportEmails },
                authToken
            );
            toast.success(response.message || 'Correos actualizados');
            setService((prev) => {
                if (!prev) return prev;
                if (Array.isArray(prev)) {
                    return prev.map((row) => ({
                        ...row,
                        reportEmail: reportEmails,
                    }));
                }
                return { ...prev, reportEmail: reportEmails };
            });
        } catch (error) {
            toast.error(error.message || 'No se pudieron actualizar', {
                id: 'service-report-emails',
            });
        } finally {
            setIsSavingEmails(false);
        }
    };

    const handleToggleActiveShifts = async () => {
        const willOpen = !isActiveShiftsVisible;
        setIsActiveShiftsVisible(willOpen);

        if (!willOpen || !authToken || !serviceId) return;

        try {
            setActiveShiftsLoading(true);
            const rows = await fetchActiveServiceShifts(authToken, serviceId);
            setActiveShifts(rows || []);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los turnos abiertos'
            );
        } finally {
            setActiveShiftsLoading(false);
        }
    };


    if (!authToken) return <Navigate to='/login' />;

    if (user && user.role !== 'admin' && user.role !== 'sudo') {
        return (
            <div className='service-detail-page'>
                <div className='service-detail-card'>
                    <h2>Acceso restringido</h2>
                    <p>Solo administradores pueden ver este detalle.</p>
                    <NavLink className='service-detail-back' to='/account'>
                        Volver al panel
                    </NavLink>
                </div>
            </div>
        );
    }

    return (
        <div className='service-detail-page'>
            <div className='service-detail-header'>
                <div>
                    <h1>Detalle del servicio</h1>
                    <p>Consulta la informacion completa del contrato.</p>
                </div>
                <div className='service-detail-actions'>
                    <NavLink className='service-detail-back' to='/account'>
                        Volver al panel
                    </NavLink>
                </div>
            </div>

            {isLoading ? (
                <div className='service-detail-card'>
                    <p>Cargando servicio...</p>
                </div>
            ) : !detail ? (
                <div className='service-detail-card'>
                    <p>No se encontro el servicio solicitado.</p>
                    <NavLink className='service-detail-back' to='/account'>
                        Volver
                    </NavLink>
                </div>
            ) : (

                <div className='service-detail-layout'>
                    <nav className='service-detail-menu'>
                        <button
                            type='button'
                            className={activeTab === 'summary' ? 'is-active' : ''}
                            onClick={() => setActiveTab('summary')}
                        >
                            Resumen
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'address' ? 'is-active' : ''}
                            onClick={() => setActiveTab('address')}
                        >
                            Direccion
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'client' ? 'is-active' : ''}
                            onClick={() => setActiveTab('client')}
                        >
                            Cliente
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'employees' ? 'is-active' : ''}
                            onClick={() => setActiveTab('employees')}
                        >
                            Empleados
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'shifts' ? 'is-active' : ''}
                            onClick={() => setActiveTab('shifts')}
                        >
                            Turnos abiertos
                        </button>
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'reports' ? 'is-active' : ''}
                                onClick={() => setActiveTab('reports')}
                            >
                                Envio partes
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'search' ? 'is-active' : ''}
                                onClick={() => setActiveTab('search')}
                            >
                                Buscar empleados
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'nfc' ? 'is-active' : ''}
                                onClick={() => setActiveTab('nfc')}
                            >
                                NFC
                            </button>
                        )}
                        <button
                            type='button'
                            className={activeTab === 'chat' ? 'is-active' : ''}
                            onClick={() => setActiveTab('chat')}
                        >
                            Chat
                        </button>
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'status' ? 'is-active' : ''}
                                onClick={() => setActiveTab('status')}
                            >
                                Estado
                            </button>
                        )}
                    </nav>

                    {activeTab === 'summary' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Resumen</h2>
                            </div>
                            <div className='service-detail-collapsible'>
                                <div className='service-detail-row'>
                                    <span>Nombre</span>
                                    <strong>{detail.name || 'Sin nombre'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Tipo</span>
                                    <strong>{detail.type || 'Sin tipo'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Estado</span>
                                    <strong>{detail.status || 'Sin estado'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Inicio</span>
                                    <strong>
                                        {formatDateTime(detail.startDateTime)}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Fin</span>
                                    <strong>
                                        {formatDateTime(detail.endDateTime)}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Horas</span>
                                    <strong>{detail.hours ?? 'Sin horas'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Personas</span>
                                    <strong>
                                        {detail.numberOfPeople ?? 'Sin informacion'}
                                    </strong>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'address' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Direccion</h2>
                            </div>
                            <div className='service-detail-collapsible'>
                                <div className='service-detail-row'>
                                    <span>Ciudad</span>
                                    <strong>{detail.city || 'Sin ciudad'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Provincia</span>
                                    <strong>{detail.province || 'Sin provincia'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Direccion</span>
                                    <strong>{detail.address || 'Sin direccion'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>CP</span>
                                    <strong>{detail.postCode || 'Sin CP'}</strong>
                                </div>
                                <div className='service-detail-notes'>
                                    <h3>Comentarios</h3>
                                    <p>{detail.comments || 'Sin comentarios'}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'client' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Cliente</h2>
                            </div>
                            <div className='service-detail-collapsible'>
                                <div className='service-detail-row'>
                                    <span>Nombre</span>
                                    <strong>
                                        {detail.clientName || ''} {detail.clientLastName || ''}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Email</span>
                                    <strong>{detail.clientEmail || 'Sin email'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Telefono</span>
                                    <strong>{detail.clientPhone || 'Sin telefono'}</strong>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'employees' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <div>
                                    <h2>Empleados asignados</h2>
                                    <p className='service-detail-help'>
                                        Capacidad: {detail.numberOfPeople}
                                    </p>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'sudo') && (
                                    <form
                                        className='service-detail-form-inline'
                                        onSubmit={handleUpdateCapacity}
                                    >
                                        <label htmlFor='numberOfPeople'>
                                            Capacidad
                                        </label>
                                        <input
                                            id='numberOfPeople'
                                            type='number'
                                            min='1'
                                            value={numberOfPeople}
                                            onChange={(e) =>
                                                setNumberOfPeople(e.target.value)
                                            }
                                            required
                                        />
                                        <button type='submit' disabled={isSaving}>
                                            {isSaving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </form>
                                )}
                            </div>
                            {assignedEmployees.length ? (
                                <div className='service-detail-list'>
                                    {assignedEmployees.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className='service-detail-employee'
                                        >
                                            <div>
                                                <strong>
                                                    {employee.firstName || ''} {employee.lastName || ''}
                                                </strong>
                                                <p>{employee.email || 'Sin email'}</p>
                                                <p>{employee.phone || 'Sin telefono'}</p>
                                                <p>{employee.dni || 'Sin DNI'}</p>
                                            </div>
                                            {(user?.role === 'admin' || user?.role === 'sudo') && (
                                                <button
                                                    type='button'
                                                    className='service-detail-btn'
                                                    onClick={() =>
                                                        handleUnassign(employee.id)
                                                    }
                                                >
                                                    Desasignar
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className='service-detail-empty'>
                                    Sin empleado asignado.
                                </p>
                            )}
                        </section>
                    )}

                    {activeTab === 'shifts' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Turnos abiertos</h2>
                                <button
                                    type='button'
                                    className='service-detail-toggle'
                                    onClick={handleToggleActiveShifts}
                                >
                                    {isActiveShiftsVisible ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            {isActiveShiftsVisible && (
                                <div className='service-detail-collapsible'>
                                    {activeShiftsLoading ? (
                                        <p className='service-detail-empty'>
                                            Cargando turnos abiertos...
                                        </p>
                                    ) : activeShifts.length ? (
                                        <div className='service-detail-list'>
                                            {activeShifts.map((employee) => (
                                                <div
                                                    key={employee.shiftId}
                                                    className='service-detail-employee service-detail-employee--active'
                                                >
                                                    <div>
                                                        <strong>
                                                            {employee.firstName || ''} {employee.lastName || ''}
                                                        </strong>
                                                        <p>{employee.email || 'Sin email'}</p>
                                                        <p>{employee.phone || 'Sin telefono'}</p>
                                                    </div>
                                                    <span className='service-detail-active-dot' />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className='service-detail-empty'>
                                            Sin turnos abiertos.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'reports' &&
                        (user?.role === 'admin' || user?.role === 'sudo') && (
                            <section className='service-detail-card service-detail-section'>
                                <div className='service-detail-section-header'>
                                    <div>
                                        <h2>Envio de partes</h2>
                                        <p className='service-detail-help'>
                                            Correos que reciben los partes del servicio
                                        </p>
                                    </div>
                                </div>
                                <form
                                    className='service-detail-form'
                                    onSubmit={handleUpdateReportEmails}
                                >
                                    <label htmlFor='reportEmails'>
                                        Correos (separados por coma)
                                    </label>
                                    <textarea
                                        id='reportEmails'
                                        rows='3'
                                        placeholder='cliente@empresa.com, otro@empresa.com'
                                        value={reportEmails}
                                        onChange={(e) =>
                                            setReportEmails(e.target.value)
                                        }
                                    />
                                    <button type='submit' disabled={isSavingEmails}>
                                        {isSavingEmails ? 'Guardando...' : 'Guardar correos'}
                                    </button>
                                </form>
                            </section>
                        )}

                    {activeTab === 'search' &&
                        (user?.role === 'admin' || user?.role === 'sudo') && (
                            <section className='service-detail-card service-detail-section'>
                                <h2>Buscar empleados</h2>
                                <ListEmployeeComponent
                                    serviceId={serviceId}
                                    numberOfPeople={detail.numberOfPeople}
                                    employeeData={assignedEmployees}
                                    setEmployeeData={setAssignedEmployees}
                                />
                            </section>
                        )}

                    {activeTab === 'nfc' &&
                        (user?.role === 'admin' || user?.role === 'sudo') && (
                            <section className='service-detail-card service-detail-section'>
                                <NfcTagsManager serviceId={serviceId} />
                            </section>
                        )}

                    {activeTab === 'chat' && (
                        <section className='service-detail-card service-detail-section'>
                            <ServiceChat
                                serviceId={serviceId}
                                title={`Chat del servicio: ${detail.name || detail.type || ''}`}
                            />
                        </section>
                    )}

                    {activeTab === 'status' &&
                        (user?.role === 'admin' || user?.role === 'sudo') && (
                            <section className='service-detail-card service-detail-footer'>
                                <div className='service-detail-footer-actions'>
                                    {detail?.status !== 'completed' ? (
                                        <button
                                            type='button'
                                            className='service-detail-btn'
                                            onClick={() =>
                                                openStatusModal('completed')
                                            }
                                            disabled={isCompleting}
                                        >
                                            {isCompleting
                                                ? 'Desactivando...'
                                                : 'Desactivar servicio'}
                                        </button>
                                    ) : (
                                        <button
                                            type='button'
                                            className='service-detail-btn service-detail-btn--confirm'
                                            onClick={() =>
                                                openStatusModal('confirmed')
                                            }
                                            disabled={isReactivating}
                                        >
                                            {isReactivating
                                                ? 'Activando...'
                                                : 'Activar servicio'}
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}
                </div>
            {statusModal.open && (
                <div className='service-detail-modal-overlay'>
                    <div className='service-detail-modal'>
                        <h3>Confirmar accion</h3>
                        <p>
                            ¿Seguro que quieres{' '}
                            {statusModal.targetStatus === 'completed'
                                ? 'desactivar'
                                : 'activar'}{' '}
                            este servicio?
                        </p>
                        <div className='service-detail-modal-actions'>
                            <button
                                type='button'
                                className='service-detail-btn service-detail-btn--ghost'
                                onClick={closeStatusModal}
                                disabled={isUpdatingStatus}
                            >
                                Cancelar
                            </button>
                            <button
                                type='button'
                                className='service-detail-btn'
                                onClick={handleConfirmStatus}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus
                                    ? 'Guardando...'
                                    : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceDetail;
