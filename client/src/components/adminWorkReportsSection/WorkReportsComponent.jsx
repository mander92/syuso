import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import { fetchShiftRecordsAdmin } from '../../services/shiftRecordService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import CalendarComponent from '../calendarComponent/CalendarComponent.jsx';
import '../adminShiftSection/ShiftComponent.css';

const { VITE_API_URL } = import.meta.env;

const WorkReportsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const [details, setDetails] = useState([]);
    const [employees, setEmployees] = useState([]);
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
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

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

        if (startDate && endDate) {
            params.append('startDate', `${startDate} 00:00:00`);
            params.append('endDate', `${endDate} 23:59:59`);
        }

        return params;
    };

    const uniqueCities = useMemo(
        () =>
            [...new Set(details.map((item) => item.city))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
        [details]
    );

    const uniqueServiceNames = useMemo(
        () =>
            [...new Set(details.map((item) => item.serviceName))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
        [details]
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
            if (startDate && endDate) {
                const start = new Date(`${startDate}T00:00:00`);
                const end = new Date(`${endDate}T23:59:59`);
                const recordDate = record.clockIn
                    ? new Date(record.clockIn)
                    : new Date(record.startDateTime);
                if (recordDate < start || recordDate > end) return false;
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
        </section>
    );
};

export default WorkReportsComponent;
