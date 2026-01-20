import { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    fetchShiftRecordsAdmin,
    fetchShiftRecordsEmployee,
    fetchShiftRecordDetail,
    fetchUpdateShiftRecord,
    fetchDeleteShiftRecord,
} from '../../services/shiftRecordService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import CalendarComponent from '../calendarComponent/CalendarComponent.jsx';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';
import './ShiftComponent.css';

const { VITE_API_URL } = import.meta.env;

const ShiftComponent = () => {
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
    const [locationPage, setLocationPage] = useState(1);
    const [locationMode, setLocationMode] = useState('shifts');
    const [selectedShift, setSelectedShift] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSaving, setModalSaving] = useState(false);
    const [modalClockIn, setModalClockIn] = useState('');
    const [modalClockOut, setModalClockOut] = useState('');

    const locationsPerPage = 10;

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

    const loadShiftRecords = async () => {
        if (!authToken || !user) return;

        try {
            setLoading(true);

            const params = buildParams();

            const data =
                isAdminLike
                    ? await fetchShiftRecordsAdmin(
                          params.toString(),
                          authToken
                      )
                    : await fetchShiftRecordsEmployee(
                          params.toString(),
                          authToken
                      );

            setDetails(data?.details || []);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los turnos'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShiftRecords();
    }, [
        authToken,
        user,
        employeeId,
        serviceName,
        city,
        delegationId,
        startDate,
        endDate,
    ]);

    useEffect(() => {
        setLocationPage(1);
    }, [
        serviceName,
        employeeId,
        startDate,
        endDate,
        personSearch,
        locationMode,
        details,
    ]);

    const handleReset = (e) => {
        e.preventDefault();
        setEmployeeId('');
        setServiceName('');
        setPersonSearch('');
        setCity('');
        setDelegationId('');
        setStartDate('');
        setEndDate('');
        setLocationMode('shifts');
    };

    const buildParams = () => {
        const params = new URLSearchParams();
        if (serviceName) params.append('serviceName', serviceName);
        if (city) params.append('city', city);
        if (delegationId) params.append('delegationId', delegationId);

        if (isAdminLike && employeeId) {
            params.append('employeeId', employeeId);
        }

        if (startDate && endDate) {
            params.append('startDate', `${startDate} 00:00:00`);
            params.append('endDate', `${endDate} 23:59:59`);
        }

        return params;
    };

    const handleExport = async () => {
        if (!authToken || !user) return;

        try {
            setIsDownloading(true);
            const params = buildParams();
            params.append('generateExcel', '1');

            const data =
                isAdminLike
                    ? await fetchShiftRecordsAdmin(
                          params.toString(),
                          authToken
                      )
                    : await fetchShiftRecordsEmployee(
                          params.toString(),
                          authToken
                      );

            if (data?.excelFilePath) {
                window.open(`${VITE_API_URL}${data.excelFilePath}`, '_blank');
            } else {
                toast.error('No se pudo generar el Excel');
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo generar el Excel');
        } finally {
            setIsDownloading(false);
        }
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

    const calendarEvents = useMemo(
        () =>
            details.map((record) => {
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
                    serviceId: record.serviceId,
                    shiftId: record.id,
                    serviceName: record.serviceName || record.type,
                    employeeName: `${record.firstName} ${record.lastName}`.trim(),
                };
            }),
        [details]
    );

    const locationRows = useMemo(() => {
        const textPerson = normalizeText(personSearch);

        return details
            .filter((record) => {
                if (locationMode === 'punches') {
                    if (!record.clockIn && !record.clockOut) {
                        return false;
                    }
                }
                if (serviceName && record.serviceName !== serviceName) {
                    return false;
                }
                if (employeeId && record.employeeId !== employeeId) {
                    return false;
                }
                if (startDate && endDate) {
                    const start = new Date(`${startDate}T00:00:00`);
                    const end = new Date(`${endDate}T23:59:59`);
                    const recordDate = record.clockIn
                        ? new Date(record.clockIn)
                        : new Date(record.startDateTime);
                    if (recordDate < start || recordDate > end) return false;
                }
                if (textPerson) {
                    const person = normalizeText(
                        `${record.firstName} ${record.lastName}`
                    );
                    if (!person.includes(textPerson)) return false;
                }
                return true;
            })
            .map((record) => ({
                id: record.id,
                employee: `${record.firstName} ${record.lastName}`,
                service: record.serviceName || record.type,
                clockIn: record.clockIn,
                clockOut: record.clockOut,
                latitudeIn: record.latitudeIn,
                longitudeIn: record.longitudeIn,
                latitudeOut: record.latitudeOut,
                longitudeOut: record.longitudeOut,
            }));
    }, [
        details,
        serviceName,
        employeeId,
        startDate,
        endDate,
        personSearch,
        locationMode,
    ]);

    const totalLocationPages = Math.max(
        1,
        Math.ceil(locationRows.length / locationsPerPage)
    );

    const pagedLocationRows = useMemo(() => {
        const start = (locationPage - 1) * locationsPerPage;
        return locationRows.slice(start, start + locationsPerPage);
    }, [locationRows, locationPage]);

    const handlePrevLocations = () => {
        setLocationPage((prev) => Math.max(1, prev - 1));
    };

    const handleNextLocations = () => {
        setLocationPage((prev) =>
            Math.min(totalLocationPages, prev + 1)
        );
    };

    const handleSelectEvent = (event) => {
        if (!event?.shiftId || !isAdminLike) return;
        const serviceNameLabel = event.serviceName || 'Servicio';
        const employeeNameLabel = event.employeeName || 'Empleado';
        setSelectedShift({
            shiftId: event.shiftId,
            serviceName: serviceNameLabel,
            employeeName: employeeNameLabel,
        });
        setModalLoading(true);
        fetchShiftRecordDetail(event.shiftId, authToken)
            .then((data) => {
                setSelectedShift((prev) => ({
                    ...prev,
                    serviceName: data?.serviceName || prev?.serviceName,
                    employeeName:
                        data?.firstName && data?.lastName
                            ? `${data.firstName} ${data.lastName}`.trim()
                            : prev?.employeeName,
                }));
                setModalClockIn(
                    data?.clockIn ? data.clockIn.slice(0, 16) : ''
                );
                setModalClockOut(
                    data?.clockOut ? data.clockOut.slice(0, 16) : ''
                );
            })
            .catch((error) => {
                toast.error(
                    error.message || 'No se pudo cargar el turno'
                );
                setSelectedShift(null);
            })
            .finally(() => {
                setModalLoading(false);
            });
    };

    const handleModalClose = () => {
        setSelectedShift(null);
        setModalClockIn('');
        setModalClockOut('');
    };

    const handleModalSave = async (e) => {
        e.preventDefault();
        if (!selectedShift?.shiftId) return;
        if (!modalClockIn || !modalClockOut) {
            toast.error('Debes indicar entrada y salida');
            return;
        }

        const normalizeDateTime = (value) => {
            const [datePart, timePart] = value.split('T');
            return `${datePart} ${timePart}:00`;
        };

        try {
            setModalSaving(true);
            const body = await fetchUpdateShiftRecord(
                selectedShift.shiftId,
                authToken,
                normalizeDateTime(modalClockIn),
                normalizeDateTime(modalClockOut)
            );
            toast.success(body.message || 'Turno actualizado');
            await loadShiftRecords();
            handleModalClose();
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar el turno');
        } finally {
            setModalSaving(false);
        }
    };

    const handleModalDelete = async () => {
        if (!selectedShift?.shiftId) return;
        if (!window.confirm('¿Seguro que quieres eliminar este turno?')) {
            return;
        }

        try {
            setModalSaving(true);
            const body = await fetchDeleteShiftRecord(
                selectedShift.shiftId,
                authToken
            );
            toast.success(body.message || 'Turno eliminado');
            await loadShiftRecords();
            handleModalClose();
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el turno');
        } finally {
            setModalSaving(false);
        }
    };

    return (
        <section className='shift-wrapper'>
            <div className='shift-header'>
                <div>
                    <h1 className='shift-title'>Turnos</h1>
                    <p className='shift-subtitle'>
                        Filtra turnos por empleado, zona, servicio y fechas.
                    </p>
                </div>

                <div className='shift-header-actions'>
                    {isAdminLike && (
                        <NavLink className='shift-btn' to='/shiftRecords/create'>
                            Crear turno
                        </NavLink>
                    )}
                </div>

                <form className='shift-filters' onSubmit={handleReset}>
                    {isAdminLike && (
                        <div className='shift-filter'>
                            <label htmlFor='employeeId'>Empleado</label>
                            <select
                                id='employeeId'
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                            >
                                <option value=''>Todos</option>
                                {employees.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.firstName} {employee.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className='shift-filter'>
                        <label htmlFor='serviceName'>Nombre del servicio</label>
                        <select
                            id='serviceName'
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

                    {isAdminLike && (
                        <div className='shift-filter'>
                            <label htmlFor='delegationId'>Delegacion</label>
                            <select
                                id='delegationId'
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
                    )}

                    <div className='shift-filter'>
                        <label htmlFor='shiftCity'>Zona</label>
                        <select
                            id='shiftCity'
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
                        <label htmlFor='startDate'>Desde</label>
                        <input
                            id='startDate'
                            type='date'
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className='shift-filter'>
                        <label htmlFor='endDate'>Hasta</label>
                        <input
                            id='endDate'
                            type='date'
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button className='shift-btn shift-btn--ghost' type='submit'>
                        Limpiar filtros
                    </button>
                    {isAdminLike && (
                        <button
                            className='shift-btn'
                            type='button'
                            onClick={handleExport}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Generando...' : 'Exportar Excel'}
                        </button>
                    )}
                </form>
            </div>

            <div className='shift-calendar-card'>
                {loading ? (
                    <p className='shift-loading'>Cargando turnos...</p>
                ) : (
                    <CalendarComponent
                        events={calendarEvents}
                        onSelectEvent={handleSelectEvent}
                    />
                )}
            </div>

            {isAdminLike && (
                <div className='shift-location-card'>
                    <h2>Geolocalizaciones</h2>
                    <div className='shift-location-filters'>
                        <select
                            value={locationMode}
                            onChange={(e) => setLocationMode(e.target.value)}
                        >
                            <option value='shifts'>Turnos</option>
                            <option value='punches'>Picadas</option>
                        </select>
                        <select
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                        >
                            <option value=''>Todos los servicios</option>
                            {uniqueServiceNames.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <input
                            type='text'
                            placeholder='Buscar persona'
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                        />
                        <div className='shift-location-range'>
                            <input
                                type='date'
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <input
                                type='date'
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    {locationRows.length ? (
                        <div className='shift-location-list'>
                            {pagedLocationRows.map((row, index) => {
                                const hasIn =
                                    row.latitudeIn && row.longitudeIn;
                                const hasOut =
                                    row.latitudeOut && row.longitudeOut;
                                const punchCoords = hasIn
                                    ? {
                                          lat: row.latitudeIn,
                                          lng: row.longitudeIn,
                                      }
                                    : hasOut
                                      ? {
                                            lat: row.latitudeOut,
                                            lng: row.longitudeOut,
                                        }
                                      : null;
                                return (
                                    <div
                                        key={`${row.id}-${row.clockIn || 'na'}-${row.clockOut || 'na'}-${index}`}
                                        className='shift-location-item'
                                    >
                                        <div>
                                            <strong>{row.service}</strong>
                                            <span>
                                                {row.employee} -{' '}
                                                {row.clockIn
                                                    ? formatDateTimeMadrid(
                                                          row.clockIn
                                                      )
                                                    : 'Sin entrada'}
                                            </span>
                                        </div>
                                        <div className='shift-location-links'>
                                            {locationMode === 'punches' ? (
                                                punchCoords ? (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${punchCoords.lat},${punchCoords.lng}`}
                                                        target='_blank'
                                                        rel='noreferrer'
                                                    >
                                                        Ver ubicacion
                                                    </a>
                                                ) : (
                                                    <span>Sin GPS</span>
                                                )
                                            ) : (
                                                <>
                                                    {hasIn ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${row.latitudeIn},${row.longitudeIn}`}
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            Ver entrada
                                                        </a>
                                                    ) : (
                                                        <span>Entrada sin GPS</span>
                                                    )}
                                                    {hasOut ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${row.latitudeOut},${row.longitudeOut}`}
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            Ver salida
                                                        </a>
                                                    ) : (
                                                        <span>Salida sin GPS</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className='shift-loading'>
                            No hay geolocalizaciones registradas.
                        </p>
                    )}
                    {locationRows.length > locationsPerPage && (
                        <div className='shift-location-pagination'>
                            <button
                                type='button'
                                className='shift-btn shift-btn--ghost'
                                onClick={handlePrevLocations}
                                disabled={locationPage === 1}
                            >
                                Anterior
                            </button>
                            <span>
                                Pagina {locationPage} de {totalLocationPages}
                            </span>
                            <button
                                type='button'
                                className='shift-btn'
                                onClick={handleNextLocations}
                                disabled={
                                    locationPage >= totalLocationPages
                                }
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {selectedShift && (
                <div className='shift-modal-overlay'>
                    <div className='shift-modal'>
                        <h3>Turno</h3>
                        <p>Servicio: {selectedShift.serviceName}</p>
                        <p>Empleado: {selectedShift.employeeName}</p>
                        {modalLoading ? (
                            <p className='shift-loading'>
                                Cargando turno...
                            </p>
                        ) : (
                            <form
                                className='shift-modal-form'
                                onSubmit={handleModalSave}
                            >
                                <label htmlFor='modal-clock-in'>Entrada</label>
                                <input
                                    id='modal-clock-in'
                                    type='datetime-local'
                                    value={modalClockIn}
                                    onChange={(e) =>
                                        setModalClockIn(e.target.value)
                                    }
                                    required
                                />
                                <label htmlFor='modal-clock-out'>Salida</label>
                                <input
                                    id='modal-clock-out'
                                    type='datetime-local'
                                    value={modalClockOut}
                                    onChange={(e) =>
                                        setModalClockOut(e.target.value)
                                    }
                                    required
                                />
                                <div className='shift-modal-actions'>
                                    <button
                                        type='submit'
                                        className='shift-btn'
                                        disabled={modalSaving}
                                    >
                                        {modalSaving
                                            ? 'Guardando...'
                                            : 'Guardar cambios'}
                                    </button>
                                    <button
                                        type='button'
                                        className='shift-btn shift-btn--ghost'
                                        onClick={handleModalClose}
                                        disabled={modalSaving}
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type='button'
                                        className='shift-btn shift-btn--danger'
                                        onClick={handleModalDelete}
                                        disabled={modalSaving}
                                    >
                                        Eliminar turno
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default ShiftComponent;
