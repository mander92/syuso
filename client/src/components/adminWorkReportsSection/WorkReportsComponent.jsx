import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    fetchCreateAdminWorkReport,
    fetchShiftRecordsAdmin,
} from '../../services/shiftRecordService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import { fetchAllServicesServices } from '../../services/serviceService.js';
import CalendarComponent from '../calendarComponent/CalendarComponent.jsx';
import '../adminShiftSection/ShiftComponent.css';

const { VITE_API_URL } = import.meta.env;

const WorkReportsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const [details, setDetails] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [personSearch, setPersonSearch] = useState('');
    const [city, setCity] = useState('');
    const [delegationId, setDelegationId] = useState('');
    const [delegations, setDelegations] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [manualReport, setManualReport] = useState({
        employeeId: '',
        serviceId: '',
        folio: '',
        reportDate: new Date().toISOString().slice(0, 10),
        incidentStart: '',
        incidentEnd: '',
        location: '',
        guardEmployeeNumber: '',
        securityCompany: 'Syuso',
        description: '',
        reportEmail: '',
    });
    const signatureCanvasRef = useRef(null);
    const isSigningRef = useRef(false);
    const [signatureData, setSignatureData] = useState('');

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    const compareText = (a, b) =>
        String(a || '').localeCompare(String(b || ''), 'es', {
            sensitivity: 'base',
        });

    const toApiDateTime = (value) => {
        if (!value) return '';
        const [datePart, timePart = ''] = value.split('T');
        if (!datePart || !timePart) return value;
        return `${datePart}T${timePart.length === 5 ? `${timePart}:00` : timePart}`;
    };

    const getCanvasPoint = (event) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const source = event.touches?.[0] || event;
        return {
            x: source.clientX - rect.left,
            y: source.clientY - rect.top,
        };
    };

    const startSignature = (event) => {
        const canvas = signatureCanvasRef.current;
        const point = getCanvasPoint(event);
        if (!canvas || !point) return;
        event.preventDefault();
        const ctx = canvas.getContext('2d');
        isSigningRef.current = true;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    };

    const drawSignature = (event) => {
        if (!isSigningRef.current) return;
        const canvas = signatureCanvasRef.current;
        const point = getCanvasPoint(event);
        if (!canvas || !point) return;
        event.preventDefault();
        const ctx = canvas.getContext('2d');
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setSignatureData(canvas.toDataURL('image/png'));
    };

    const endSignature = () => {
        isSigningRef.current = false;
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
    };

    useEffect(() => {
        const loadEmployees = async () => {
            if (!authToken || !isAdminLike) return;

            try {
                const params = new URLSearchParams({
                    role: 'employee',
                    active: '1',
                });

                const data = await fetchAllUsersServices(
                    params.toString(),
                    authToken
                );

                const list = Array.isArray(data) ? data : data?.users || [];
                setEmployees(list);
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar empleados');
            }
        };

        loadEmployees();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        if (!createModalOpen) return;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 520;
        const height = rect.height || 160;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#111827';
    }, [createModalOpen]);

    useEffect(() => {
        const loadServices = async () => {
            if (!authToken || !isAdminLike) return;

            try {
                const data = await fetchAllServicesServices('', authToken);
                const list = Array.isArray(data)
                    ? data
                    : data?.data || data?.services || [];
                setServices(list);
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar servicios');
            }
        };

        loadServices();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        const loadDelegations = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                const data = await fetchDelegations(authToken);
                setDelegations(data);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar delegaciones'
                );
            }
        };

        loadDelegations();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        const loadShiftRecords = async () => {
            if (!authToken || !user || !isAdminLike) return;

            try {
                setLoading(true);
                const params = buildParams();
                const data = await fetchShiftRecordsAdmin(
                    params.toString(),
                    authToken
                );
                setDetails(data?.details || []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los partes'
                );
            } finally {
                setLoading(false);
            }
        };

        loadShiftRecords();
    }, [
        authToken,
        user,
        isAdminLike,
        employeeId,
        serviceName,
        city,
        delegationId,
        startDate,
        endDate,
    ]);

    const handleReset = (event) => {
        event.preventDefault();
        setEmployeeId('');
        setServiceName('');
        setPersonSearch('');
        setCity('');
        setDelegationId('');
        setStartDate('');
        setEndDate('');
    };

    const buildParams = () => {
        const params = new URLSearchParams();
        if (serviceName) params.append('serviceName', serviceName);
        if (city) params.append('city', city);
        if (delegationId) params.append('delegationId', delegationId);
        if (personSearch) params.append('personSearch', personSearch);

        if (employeeId) {
            params.append('employeeId', employeeId);
        }

        if (startDate) {
            params.append('startDate', `${startDate} 00:00:00`);
        }

        if (endDate) {
            params.append('endDate', `${endDate} 23:59:59`);
        }

        return params;
    };

    const uniqueCities = useMemo(
        () =>
            [...new Set(details.map((item) => item.city))]
                .filter(Boolean)
                .sort(compareText),
        [details]
    );

    const uniqueServiceNames = useMemo(
        () =>
            [...new Set(details.map((item) => item.serviceName))]
                .filter(Boolean)
                .sort(compareText),
        [details]
    );

    const serviceOptions = useMemo(
        () =>
            services
                .map((service) => ({
                    id: service.serviceId || service.id,
                    name:
                        service.name ||
                        service.serviceName ||
                        service.type ||
                        'Servicio',
                    startDateTime: service.startDateTime,
                    city: service.city || service.province || '',
                }))
                .filter((service) => service.id)
                .sort((a, b) => compareText(a.name, b.name)),
        [services]
    );

    const filteredDetails = useMemo(() => {
        const personText = normalizeText(personSearch);
        return details.filter((record) => {
            if (!record.reportId) return false;
            if (personText) {
                const person = normalizeText(
                    `${record.firstName} ${record.lastName}`
                );
                if (!person.includes(personText)) return false;
            }
            if (startDate || endDate) {
                const start = startDate
                    ? new Date(`${startDate}T00:00:00`)
                    : null;
                const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
                const recordDate = record.reportDate
                    ? new Date(record.reportDate)
                    : record.clockIn
                    ? new Date(record.clockIn)
                    : new Date(record.startDateTime);
                if (start && recordDate < start) return false;
                if (end && recordDate > end) return false;
            }
            return true;
        });
    }, [details, personSearch, startDate, endDate]);

    const calendarEvents = useMemo(
        () =>
            filteredDetails.map((record) => {
                const start = record.clockIn
                    ? new Date(record.clockIn)
                    : new Date(record.startDateTime);

                let end = record.clockOut
                    ? new Date(record.clockOut)
                    : new Date(start);

                if (!record.clockOut) {
                    const hours = Number(record.hours) || 1;
                    end.setHours(end.getHours() + hours);
                }

                const title = record.serviceName
                    ? `${record.serviceName} - ${record.firstName} ${record.lastName}`
                    : `${record.type} - ${record.firstName} ${record.lastName}`;

                return {
                    title,
                    start,
                    end,
                    allDay: false,
                    status: record.status,
                    reportId: record.reportId,
                };
            }),
        [filteredDetails]
    );

    const handleSelectEvent = async (event) => {
        if (!event?.reportId) {
            toast.error('Este turno no tiene parte de trabajo');
            return;
        }
        if (!authToken) return;

        try {
            const res = await fetch(
                `${VITE_API_URL}/workReports/${event.reportId}/pdf`,
                {
                    headers: {
                        Authorization: authToken,
                    },
                }
            );

            if (!res.ok) {
                let message = 'No se pudo abrir el PDF';
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const body = await res.json();
                    message = body?.message || message;
                }
                throw new Error(message);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 4000);
        } catch (error) {
            toast.error(error.message || 'No se pudo abrir el PDF');
        }
    };

    const handleDownloadZip = async () => {
        if (!authToken) return;
        try {
            setIsDownloading(true);
            const params = buildParams();
            const res = await fetch(
                `${VITE_API_URL}/workReports/zip?${params.toString()}`,
                {
                    headers: {
                        Authorization: authToken,
                    },
                }
            );

            if (!res.ok) {
                let message = 'No se pudo descargar el ZIP';
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const body = await res.json();
                    message = body?.message || message;
                }
                throw new Error(message);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const disposition = res.headers.get('content-disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || 'partes_trabajo.zip';

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(
                error.message || 'No se pudo descargar el ZIP'
            );
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenDeleteModal = () => {
        setDeleteModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        if (isCreatingReport) return;
        setCreateModalOpen(false);
    };

    const handleManualReportChange = (field, value) => {
        setManualReport((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateManualReport = async (event) => {
        event.preventDefault();
        if (!authToken) return;

        if (
            !manualReport.employeeId ||
            !manualReport.serviceId ||
            !manualReport.incidentStart ||
            !manualReport.incidentEnd ||
            !manualReport.description.trim() ||
            !signatureData
        ) {
            toast.error(
                'Completa trabajador, servicio, horas, descripcion y firma.'
            );
            return;
        }

        try {
            setIsCreatingReport(true);
            await fetchCreateAdminWorkReport(authToken, {
                ...manualReport,
                incidentStart: toApiDateTime(manualReport.incidentStart),
                incidentEnd: toApiDateTime(manualReport.incidentEnd),
                description: manualReport.description.trim(),
                signature: signatureData,
            });
            toast.success('Parte creado');
            const params = buildParams();
            const data = await fetchShiftRecordsAdmin(
                params.toString(),
                authToken
            );
            setDetails(data?.details || []);
            setCreateModalOpen(false);
            setManualReport((prev) => ({
                ...prev,
                folio: '',
                incidentStart: '',
                incidentEnd: '',
                location: '',
                guardEmployeeNumber: '',
                description: '',
                reportEmail: '',
            }));
            clearSignature();
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el parte');
        } finally {
            setIsCreatingReport(false);
        }
    };

    const handleCloseDeleteModal = () => {
        if (isDeleting) return;
        setDeleteModalOpen(false);
    };

    const handleDeleteFiltered = async () => {
        if (!authToken) return;
        try {
            setIsDeleting(true);
            const params = buildParams();
            const res = await fetch(
                `${VITE_API_URL}/workReports?${params.toString()}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: authToken,
                    },
                }
            );

            if (!res.ok) {
                let message = 'No se pudieron eliminar los partes';
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const body = await res.json();
                    message = body?.message || message;
                }
                throw new Error(message);
            }

            toast.success('Partes eliminados');
            setDetails([]);
            setDeleteModalOpen(false);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron eliminar los partes'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isAdminLike) {
        return (
            <section className='shift-wrapper'>
                <div className='shift-header'>
                    <h1 className='shift-title'>Partes de trabajo</h1>
                </div>
                <p className='shift-loading'>
                    Solo administradores pueden ver los partes.
                </p>
            </section>
        );
    }

    return (
        <section className='shift-wrapper'>
            <div className='shift-header'>
                <div>
                    <h1 className='shift-title'>Partes de trabajo</h1>
                    <p className='shift-subtitle'>
                        Filtra partes por empleado, zona, servicio y fechas.
                    </p>
                </div>

                <div className='shift-header-actions'>
                    <button
                        className='shift-btn'
                        type='button'
                        onClick={handleOpenCreateModal}
                    >
                        Crear parte
                    </button>
                    <button
                        className='shift-btn'
                        type='button'
                        onClick={handleDownloadZip}
                        disabled={isDownloading}
                    >
                        {isDownloading
                            ? 'Descargando...'
                            : 'Descargar ZIP'}
                    </button>
                    <button
                        className='shift-btn shift-btn--ghost'
                        type='button'
                        onClick={handleOpenDeleteModal}
                        disabled={isDownloading || isDeleting}
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar partes'}
                    </button>
                </div>

                <form className='shift-filters' onSubmit={handleReset}>
                    <div className='shift-filter'>
                        <label htmlFor='workEmployeeId'>Empleado</label>
                        <select
                            id='workEmployeeId'
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.firstName} {employee.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='workPersonSearch'>
                            Buscar empleado
                        </label>
                        <input
                            id='workPersonSearch'
                            type='text'
                            placeholder='Nombre o apellido'
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                        />
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='workServiceName'>
                            Nombre del servicio
                        </label>
                        <select
                            id='workServiceName'
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            {uniqueServiceNames.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='workDelegationId'>Delegacion</label>
                        <select
                            id='workDelegationId'
                            value={delegationId}
                            onChange={(e) =>
                                setDelegationId(e.target.value)
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

                    <div className='shift-filter'>
                        <label htmlFor='workCity'>Zona</label>
                        <select
                            id='workCity'
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        >
                            <option value=''>Todas</option>
                            {uniqueCities.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='workStartDate'>Desde</label>
                        <input
                            id='workStartDate'
                            type='date'
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='workEndDate'>Hasta</label>
                        <input
                            id='workEndDate'
                            type='date'
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button className='shift-btn shift-btn--ghost' type='submit'>
                        Limpiar filtros
                    </button>
                </form>
            </div>

            <div className='shift-calendar-card'>
                {loading ? (
                    <p className='shift-loading'>Cargando partes...</p>
                ) : calendarEvents.length ? (
                    <CalendarComponent
                        events={calendarEvents}
                        onSelectEvent={handleSelectEvent}
                    />
                ) : (
                    <p className='shift-loading'>
                        No hay partes de trabajo con esos filtros.
                    </p>
                )}
            </div>

            {deleteModalOpen && (
                <div className='shift-modal-overlay'>
                    <div className='shift-modal'>
                        <h3>Eliminar partes filtrados</h3>
                        <p>
                            Esta accion borrara los partes que coinciden con
                            los filtros actuales. ¿Quieres continuar?
                        </p>
                        <div className='shift-modal-actions'>
                            <button
                                type='button'
                                className='shift-btn shift-btn--ghost'
                                onClick={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                type='button'
                                className='shift-btn'
                                onClick={handleDeleteFiltered}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Eliminando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {createModalOpen && (
                <div className='shift-modal-overlay'>
                    <form
                        className='shift-modal'
                        onSubmit={handleCreateManualReport}
                    >
                        <h3>Crear parte de trabajo</h3>
                        <div className='shift-form-grid'>
                            <label className='shift-filter'>
                                <span>Trabajador</span>
                                <select
                                    value={manualReport.employeeId}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'employeeId',
                                            event.target.value
                                        )
                                    }
                                    required
                                >
                                    <option value=''>Selecciona</option>
                                    {employees.map((employee) => (
                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {employee.firstName}{' '}
                                            {employee.lastName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className='shift-filter'>
                                <span>Servicio</span>
                                <select
                                    value={manualReport.serviceId}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'serviceId',
                                            event.target.value
                                        )
                                    }
                                    required
                                >
                                    <option value=''>Selecciona</option>
                                    {serviceOptions.map((service) => (
                                        <option
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name}
                                            {service.city
                                                ? ` - ${service.city}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className='shift-filter'>
                                <span>Folio</span>
                                <input
                                    type='text'
                                    value={manualReport.folio}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'folio',
                                            event.target.value
                                        )
                                    }
                                    placeholder='Automatico si lo dejas vacio'
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>Fecha del parte</span>
                                <input
                                    type='date'
                                    value={manualReport.reportDate}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'reportDate',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>Inicio</span>
                                <input
                                    type='datetime-local'
                                    value={manualReport.incidentStart}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'incidentStart',
                                            event.target.value
                                        )
                                    }
                                    required
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>Fin</span>
                                <input
                                    type='datetime-local'
                                    value={manualReport.incidentEnd}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'incidentEnd',
                                            event.target.value
                                        )
                                    }
                                    required
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>Ubicacion</span>
                                <input
                                    type='text'
                                    value={manualReport.location}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'location',
                                            event.target.value
                                        )
                                    }
                                    placeholder='Se usa la direccion del servicio si esta vacio'
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>TIP / numero empleado</span>
                                <input
                                    type='text'
                                    value={manualReport.guardEmployeeNumber}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'guardEmployeeNumber',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className='shift-filter'>
                                <span>Correo destino</span>
                                <input
                                    type='email'
                                    value={manualReport.reportEmail}
                                    onChange={(event) =>
                                        handleManualReportChange(
                                            'reportEmail',
                                            event.target.value
                                        )
                                    }
                                    placeholder='Opcional'
                                />
                            </label>
                        </div>

                        <label className='shift-filter'>
                            <span>Descripcion</span>
                            <textarea
                                rows={4}
                                value={manualReport.description}
                                onChange={(event) =>
                                    handleManualReportChange(
                                        'description',
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <div className='shift-signature-field'>
                            <div className='shift-signature-field__head'>
                                <span>Firma</span>
                                <button
                                    type='button'
                                    className='shift-btn shift-btn--ghost'
                                    onClick={clearSignature}
                                    disabled={isCreatingReport}
                                >
                                    Limpiar firma
                                </button>
                            </div>
                            <canvas
                                ref={signatureCanvasRef}
                                className='shift-signature-canvas'
                                onMouseDown={startSignature}
                                onMouseMove={drawSignature}
                                onMouseUp={endSignature}
                                onMouseLeave={endSignature}
                                onTouchStart={startSignature}
                                onTouchMove={drawSignature}
                                onTouchEnd={endSignature}
                            />
                        </div>

                        <div className='shift-modal-actions'>
                            <button
                                type='button'
                                className='shift-btn shift-btn--ghost'
                                onClick={handleCloseCreateModal}
                                disabled={isCreatingReport}
                            >
                                Cancelar
                            </button>
                            <button
                                type='submit'
                                className='shift-btn'
                                disabled={isCreatingReport}
                            >
                                {isCreatingReport
                                    ? 'Creando...'
                                    : 'Crear parte'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default WorkReportsComponent;
