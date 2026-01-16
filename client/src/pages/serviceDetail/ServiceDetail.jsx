import { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchDetailServiceServices,
    fetchEditServiceServices,
} from '../../services/serviceService.js';
import { fetchUpdateServiceStatus } from '../../services/serviceService.js';
import { fetchDeleteEmployeeService } from '../../services/personAssigned.js';
import ListEmployeeComponent from '../../components/adminServiceSection/listEmployeeComponent/ListEmployeeComponent.jsx';
import ServiceChat from '../../components/serviceChat/ServiceChat.jsx';
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
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [isClientVisible, setIsClientVisible] = useState(false);
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [isAddressVisible, setIsAddressVisible] = useState(false);
    const [statusModal, setStatusModal] = useState({
        open: false,
        targetStatus: '',
    });
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
                    <section className='service-detail-card service-detail-section'>
                        <div className='service-detail-section-header'>
                            <h2>Resumen</h2>
                            <button
                                type='button'
                                className='service-detail-toggle'
                                onClick={() =>
                                    setIsSummaryVisible((prev) => !prev)
                                }
                            >
                                {isSummaryVisible
                                    ? 'Ocultar'
                                    : 'Mostrar detalles'}
                            </button>
                        </div>
                        {isSummaryVisible && (
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
                                        {detail.numberOfPeople ??
                                            'Sin informacion'}
                                    </strong>
                                </div>                            </div>
                        )}
                    </section>

                    <section className='service-detail-card service-detail-section'>
                        <div className='service-detail-section-header'>
                            <h2>Direccion</h2>
                            <button
                                type='button'
                                className='service-detail-toggle'
                                onClick={() =>
                                    setIsAddressVisible((prev) => !prev)
                                }
                            >
                                {isAddressVisible
                                    ? 'Ocultar'
                                    : 'Mostrar detalles'}
                            </button>
                        </div>
                        {isAddressVisible && (
                            <div className='service-detail-collapsible'>
                                <div className='service-detail-row'>
                                    <span>Ciudad</span>
                                    <strong>{detail.city || 'Sin ciudad'}</strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Provincia</span>
                                    <strong>
                                        {detail.province || 'Sin provincia'}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Direccion</span>
                                    <strong>
                                        {detail.address || 'Sin direccion'}
                                    </strong>
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
                        )}
                    </section>

                    <section className='service-detail-card service-detail-section'>
                        <div className='service-detail-section-header'>
                            <h2>Cliente</h2>
                            <button
                                type='button'
                                className='service-detail-toggle'
                                onClick={() =>
                                    setIsClientVisible((prev) => !prev)
                                }
                            >
                                {isClientVisible
                                    ? 'Ocultar'
                                    : 'Mostrar detalles'}
                            </button>
                        </div>
                        {isClientVisible && (
                            <div className='service-detail-collapsible'>
                                <div className='service-detail-row'>
                                    <span>Nombre</span>
                                    <strong>
                                        {detail.clientName || ''}{' '}
                                        {detail.clientLastName || ''}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Email</span>
                                    <strong>
                                        {detail.clientEmail || 'Sin email'}
                                    </strong>
                                </div>
                                <div className='service-detail-row'>
                                    <span>Telefono</span>
                                    <strong>
                                        {detail.clientPhone || 'Sin telefono'}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className='service-detail-card service-detail-section'>
                        <div className='service-detail-section-header'>
                            <div>
                                <h2>Empleados asignados</h2>
                                <p className='service-detail-help'>
                                    Capacidad: {detail.numberOfPeople}
                                </p>
                            </div>
                            {(user?.role === 'admin' ||
                                user?.role === 'sudo') && (
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
                                                {employee.firstName || ''}{' '}
                                                {employee.lastName || ''}
                                            </strong>
                                            <p>{employee.email || 'Sin email'}</p>
                                            <p>
                                                {employee.phone || 'Sin telefono'}
                                            </p>
                                            <p>{employee.dni || 'Sin DNI'}</p>
                                        </div>
                                        {(user?.role === 'admin' ||
                                            user?.role === 'sudo') && (
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

                    {(user?.role === 'admin' || user?.role === 'sudo') && (
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

                    <section className='service-detail-card service-detail-section'>
                        <ServiceChat
                            serviceId={serviceId}
                            title={`Chat del servicio: ${detail.name || detail.type || ''}`}
                        />
                    </section>

                    {(user?.role === 'admin' || user?.role === 'sudo') && (
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
            )}

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
