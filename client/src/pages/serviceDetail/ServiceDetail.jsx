import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { fetchAllUsersServices } from '../../services/userService.js';
import { fetchAllTypeOfServicesServices } from '../../services/typeOfServiceService.js';
import ListEmployeeComponent from '../../components/adminServiceSection/listEmployeeComponent/ListEmployeeComponent.jsx';
import ServiceChat from '../../components/serviceChat/ServiceChat.jsx';
import NfcTagsManager from '../../components/nfcTags/NfcTagsManager.jsx';
import ServiceSchedulePanel from '../../components/serviceSchedule/ServiceSchedulePanel.jsx';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import './ServiceDetail.css';

const formatDateTimeInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoFromInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

const ServiceDetail = () => {
    const { serviceId } = useParams();
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [service, setService] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [typeOptions, setTypeOptions] = useState([]);
    const [summaryForm, setSummaryForm] = useState({
        name: '',
        typeOfServicesId: '',
        status: '',
        startDateTime: '',
        endDateTime: '',
        hours: '',
        numberOfPeople: '',
        allowUnscheduledClockIn: false,
        clockInEarlyMinutes: '15',
        address: '',
        city: '',
        postCode: '',
        comments: '',
        locationLink: '',
        clientId: '',
    });
    const [numberOfPeople, setNumberOfPeople] = useState('');
    const [reportEmails, setReportEmails] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSummary, setIsSavingSummary] = useState(false);
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
    const { unreadByService, resetServiceUnread } = useChatNotifications();
    const unreadChats = unreadByService?.[serviceId] || 0;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [serviceId]);

    const loadService = useCallback(async () => {
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
            setSummaryForm({
                name: rows[0]?.name || '',
                typeOfServicesId: rows[0]?.typeOfServicesId || '',
                status: rows[0]?.status || '',
                startDateTime: formatDateTimeInput(rows[0]?.startDateTime),
                endDateTime: formatDateTimeInput(rows[0]?.endDateTime),
                hours:
                    rows[0]?.hours != null ? String(rows[0].hours) : '',
                numberOfPeople:
                    rows[0]?.numberOfPeople != null
                        ? String(rows[0].numberOfPeople)
                        : '',
                allowUnscheduledClockIn: !!rows[0]?.allowUnscheduledClockIn,
                clockInEarlyMinutes:
                    rows[0]?.clockInEarlyMinutes != null
                        ? String(rows[0].clockInEarlyMinutes)
                        : '15',
                address: rows[0]?.address || '',
                city: rows[0]?.city || '',
                postCode: rows[0]?.postCode || '',
                comments: rows[0]?.comments || '',
                locationLink: rows[0]?.locationLink || '',
                clientId: rows[0]?.clientId || '',
            });
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar el servicio', {
                id: 'service-detail',
            });
        } finally {
            setIsLoading(false);
        }
    }, [authToken, serviceId]);

    useEffect(() => {
        if (authToken && serviceId) {
            loadService();
        }
    }, [authToken, serviceId, loadService]);

    const detail = useMemo(() => {
        if (!service) return null;
        return Array.isArray(service) ? service[0] : service;
    }, [service]);

    useEffect(() => {
        if (!authToken || !user || (user.role !== 'admin' && user.role !== 'sudo')) {
            return;
        }

        const loadOptions = async () => {
            try {
                const [clientRows, typeRows] = await Promise.all([
                    fetchAllUsersServices('role=client&active=1', authToken),
                    fetchAllTypeOfServicesServices(''),
                ]);
                setClients(Array.isArray(clientRows) ? clientRows : []);
                setTypeOptions(Array.isArray(typeRows) ? typeRows : []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los datos',
                    { id: 'service-detail-options' }
                );
            }
        };

        loadOptions();
    }, [authToken, user]);

    const selectedClient = useMemo(() => {
        return clients.find((client) => client.id === summaryForm.clientId);
    }, [clients, summaryForm.clientId]);

    const selectedType = useMemo(() => {
        return typeOptions.find(
            (typeItem) => typeItem.id === summaryForm.typeOfServicesId
        );
    }, [typeOptions, summaryForm.typeOfServicesId]);

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

    const loadActiveShifts = async () => {
        if (!authToken || !serviceId) return;
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

    const handleSummaryChange = (field) => (event) => {
        const { type, checked, value } = event.target;
        setSummaryForm((prev) => ({
            ...prev,
            [field]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSaveSummary = async (event) => {
        event.preventDefault();

        try {
            setIsSavingSummary(true);
            const payload = {
                name: summaryForm.name,
                status: summaryForm.status,
                hours: summaryForm.hours,
                numberOfPeople: summaryForm.numberOfPeople,
                address: summaryForm.address,
                city: summaryForm.city,
                postCode: summaryForm.postCode,
                comments: summaryForm.comments,
                locationLink: summaryForm.locationLink,
                allowUnscheduledClockIn: summaryForm.allowUnscheduledClockIn,
                clockInEarlyMinutes: summaryForm.clockInEarlyMinutes,
                clientId: summaryForm.clientId,
                typeOfServicesId: summaryForm.typeOfServicesId,
                ...(summaryForm.startDateTime
                    ? { startDateTime: toIsoFromInput(summaryForm.startDateTime) }
                    : {}),
                endDateTime:
                    summaryForm.endDateTime === ''
                        ? ''
                        : toIsoFromInput(summaryForm.endDateTime),
            };

            const response = await fetchEditServiceServices(
                serviceId,
                payload,
                authToken
            );
            toast.success(response.message || 'Servicio actualizado');
            if (summaryForm.numberOfPeople !== '') {
                setNumberOfPeople(summaryForm.numberOfPeople);
            }
            await loadService();
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar', {
                id: 'service-summary-update',
            });
        } finally {
            setIsSavingSummary(false);
        }
    };


    useEffect(() => {
        if (activeTab === 'shifts') {
            loadActiveShifts();
        }
    }, [activeTab, authToken, serviceId]);

    useEffect(() => {
        if (activeTab === 'chat') {
            resetServiceUnread(serviceId);
        }
    }, [activeTab, resetServiceUnread, serviceId]);


    if (!authToken) return <Navigate to='/login' />;

    if (user && user.role !== 'admin' && user.role !== 'sudo') {
        return (
            <div
                className={`service-detail-page${
                    activeTab === 'schedule' ? ' service-detail-page--wide' : ''
                }`}
            >
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
        <div
            className={`service-detail-page${
                activeTab === 'schedule' ? ' service-detail-page--wide' : ''
            }`}
        >
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
                            className={activeTab === 'chat' ? 'is-active' : ''}
                            onClick={() => setActiveTab('chat')}
                        >
                            <span className='service-detail-menu-label'>
                                <span
                                    className='service-detail-menu-icon'
                                    aria-hidden='true'
                                >
                                    <svg
                                        viewBox='0 0 24 24'
                                        role='img'
                                        aria-hidden='true'
                                    >
                                        <path
                                            d='M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8.5c0 1.38-1.12 2.5-2.5 2.5H9.7l-3.55 3.2c-.63.57-1.65.12-1.65-.73V16.5C4 16.5 4 5.5 4 5.5z'
                                            fill='currentColor'
                                        />
                                    </svg>
                                </span>
                                Chat
                            </span>
                            {unreadChats > 0 && (
                                <span className='service-detail-badge'>
                                    {unreadChats}
                                </span>
                            )}
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'shifts' ? 'is-active' : ''}
                            onClick={() => setActiveTab('shifts')}
                        >
                            Turnos abiertos
                        </button>
                        <button
                            type='button'
                            className={activeTab === 'employees' ? 'is-active' : ''}
                            onClick={() => setActiveTab('employees')}
                        >
                            Empleados
                        </button>
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'nfc' ? 'is-active' : ''}
                                onClick={() => setActiveTab('nfc')}
                            >
                                NFC
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'schedule' ? 'is-active' : ''}
                                onClick={() => setActiveTab('schedule')}
                            >
                                Cuadrante
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'sudo') && (
                            <button
                                type='button'
                                className={activeTab === 'status' ? 'is-active' : ''}
                                onClick={() => setActiveTab('status')}
                            >
                                Estado
                            </button>
                        )}
                        <button
                            type='button'
                            className={activeTab === 'summary' ? 'is-active' : ''}
                            onClick={() => setActiveTab('summary')}
                        >
                            Resumen
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
                    </nav>

                    {activeTab === 'summary' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Resumen</h2>
                            </div>
                            <form
                                className='service-detail-summary-form'
                                onSubmit={handleSaveSummary}
                            >
                                <div className='service-detail-summary-grid'>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceName'>Nombre</label>
                                        <input
                                            id='serviceName'
                                            type='text'
                                            value={summaryForm.name}
                                            onChange={handleSummaryChange('name')}
                                            placeholder='Nombre del servicio'
                                        />
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceType'>Tipo</label>
                                        <select
                                            id='serviceType'
                                            value={summaryForm.typeOfServicesId}
                                            onChange={handleSummaryChange(
                                                'typeOfServicesId'
                                            )}
                                        >
                                            <option value=''>Selecciona un tipo</option>
                                            {typeOptions.map((typeItem) => (
                                                <option
                                                    key={typeItem.id}
                                                    value={typeItem.id}
                                                >
                                                    {typeItem.type} - {typeItem.city}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceStatus'>Estado</label>
                                        <select
                                            id='serviceStatus'
                                            value={summaryForm.status}
                                            onChange={handleSummaryChange('status')}
                                        >
                                            <option value='pending'>Pendiente</option>
                                            <option value='confirmed'>Confirmado</option>
                                            <option value='completed'>Completado</option>
                                        </select>
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceStart'>Inicio</label>
                                        <input
                                            id='serviceStart'
                                            type='datetime-local'
                                            value={summaryForm.startDateTime}
                                            onChange={handleSummaryChange('startDateTime')}
                                        />
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceEnd'>Fin</label>
                                        <input
                                            id='serviceEnd'
                                            type='datetime-local'
                                            value={summaryForm.endDateTime}
                                            onChange={handleSummaryChange('endDateTime')}
                                        />
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='serviceHours'>Horas</label>
                                        <input
                                            id='serviceHours'
                                            type='number'
                                            min='1'
                                            value={summaryForm.hours}
                                            onChange={handleSummaryChange('hours')}
                                        />
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='servicePeople'>Personas</label>
                                        <input
                                            id='servicePeople'
                                            type='number'
                                            min='1'
                                            value={summaryForm.numberOfPeople}
                                            onChange={handleSummaryChange(
                                                'numberOfPeople'
                                            )}
                                        />
                                    </div>
                                    <div className='service-detail-summary-field service-detail-summary-field--toggle'>
                                        <label
                                            htmlFor='allowUnscheduledClockIn'
                                        >
                                            Fichaje sin cuadrante
                                        </label>
                                        <input
                                            id='allowUnscheduledClockIn'
                                            type='checkbox'
                                            checked={
                                                summaryForm.allowUnscheduledClockIn
                                            }
                                            onChange={handleSummaryChange(
                                                'allowUnscheduledClockIn'
                                            )}
                                        />
                                    </div>
                                    <div className='service-detail-summary-field'>
                                        <label htmlFor='clockInEarlyMinutes'>
                                            Minutos antes para fichar
                                        </label>
                                        <input
                                            id='clockInEarlyMinutes'
                                            type='number'
                                            min='0'
                                            value={summaryForm.clockInEarlyMinutes}
                                            onChange={handleSummaryChange(
                                                'clockInEarlyMinutes'
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className='service-detail-summary-block'>
                                    <h3>Direccion</h3>
                                    <div className='service-detail-summary-grid'>
                                        <div className='service-detail-summary-field'>
                                            <label htmlFor='serviceCity'>Ciudad</label>
                                            <input
                                                id='serviceCity'
                                                type='text'
                                                value={summaryForm.city}
                                                onChange={handleSummaryChange('city')}
                                            />
                                        </div>
                                        <div className='service-detail-summary-field'>
                                            <label htmlFor='serviceProvince'>Provincia</label>
                                            <input
                                                id='serviceProvince'
                                                type='text'
                                                value={
                                                    selectedType?.city ||
                                                    detail.province ||
                                                    ''
                                                }
                                                disabled
                                            />
                                        </div>
                                        <div className='service-detail-summary-field'>
                                            <label htmlFor='serviceAddress'>Direccion</label>
                                            <input
                                                id='serviceAddress'
                                                type='text'
                                                value={summaryForm.address}
                                                onChange={handleSummaryChange('address')}
                                            />
                                        </div>
                                        <div className='service-detail-summary-field'>
                                            <label htmlFor='servicePostCode'>CP</label>
                                            <input
                                                id='servicePostCode'
                                                type='text'
                                                value={summaryForm.postCode}
                                                onChange={handleSummaryChange('postCode')}
                                            />
                                        </div>
                                        <div className='service-detail-summary-field service-detail-summary-field--wide'>
                                            <label htmlFor='serviceLocationLink'>
                                                Enlace ubicacion
                                            </label>
                                            <input
                                                id='serviceLocationLink'
                                                type='url'
                                                value={summaryForm.locationLink}
                                                onChange={handleSummaryChange('locationLink')}
                                                placeholder='https://maps.google.com/...'
                                            />
                                            {summaryForm.locationLink ? (
                                                <a
                                                    href={summaryForm.locationLink}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    className='service-detail-summary-link'
                                                >
                                                    Ver ubicacion
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className='service-detail-summary-block'>
                                    <h3>Comentarios</h3>
                                    <textarea
                                        rows='3'
                                        value={summaryForm.comments}
                                        onChange={handleSummaryChange('comments')}
                                        placeholder='Comentarios del servicio'
                                    />
                                </div>

                                <div className='service-detail-summary-block'>
                                    <h3>Cliente</h3>
                                    <div className='service-detail-summary-grid'>
                                        <div className='service-detail-summary-field service-detail-summary-field--wide'>
                                            <label htmlFor='serviceClient'>Cliente</label>
                                            <select
                                                id='serviceClient'
                                                value={summaryForm.clientId}
                                                onChange={handleSummaryChange('clientId')}
                                            >
                                                <option value=''>
                                                    Selecciona un cliente
                                                </option>
                                                {clients.map((client) => (
                                                    <option
                                                        key={client.id}
                                                        value={client.id}
                                                    >
                                                        {client.firstName} {client.lastName} ({client.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className='service-detail-summary-field'>
                                            <label>Email</label>
                                            <input
                                                type='text'
                                                value={
                                                    selectedClient?.email ||
                                                    detail.clientEmail ||
                                                    ''
                                                }
                                                disabled
                                            />
                                        </div>
                                        <div className='service-detail-summary-field'>
                                            <label>Telefono</label>
                                            <input
                                                type='text'
                                                value={
                                                    selectedClient?.phone ||
                                                    detail.clientPhone ||
                                                    ''
                                                }
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='service-detail-summary-actions'>
                                    <button type='submit' disabled={isSavingSummary}>
                                        {isSavingSummary ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {activeTab === 'schedule' && (
                        <section className='service-detail-card service-detail-section service-detail-section--schedule'>
                            <ServiceSchedulePanel
                                serviceId={serviceId}
                                authToken={authToken}
                                allowUnscheduledClockIn={
                                    summaryForm.allowUnscheduledClockIn
                                }
                                scheduleImage={detail?.scheduleImage || ''}
                                scheduleView={detail?.scheduleView || 'grid'}
                                onServiceUpdate={loadService}
                            />
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
                            {(user?.role === 'admin' || user?.role === 'sudo') && (
                                <div className='service-detail-employee-search'>
                                    <h3>Buscar empleados</h3>
                                    <ListEmployeeComponent
                                        serviceId={serviceId}
                                        numberOfPeople={detail.numberOfPeople}
                                        employeeData={assignedEmployees}
                                        setEmployeeData={setAssignedEmployees}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'shifts' && (
                        <section className='service-detail-card service-detail-section'>
                            <div className='service-detail-section-header'>
                                <h2>Turnos abiertos</h2>
                            </div>
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
                                manageRoom={false}
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
