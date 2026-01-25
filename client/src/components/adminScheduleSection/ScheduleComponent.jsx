import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import { fetchDelegations } from '../../services/delegationService.js';
import {
    fetchAllServicesServices,
    fetchServiceScheduleShifts,
    fetchServiceScheduleTemplates,
    downloadServiceSchedulePdf,
    downloadServiceScheduleZip,
    downloadEmployeeSchedulePdf,
    downloadEmployeeScheduleZip,
} from '../../services/serviceService.js';
import ServiceSchedulePanel from '../serviceSchedule/ServiceSchedulePanel.jsx';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import '../button/Button.css';
import './ScheduleComponent.css';
import '../serviceSchedule/ServiceSchedulePanel.css';

const ScheduleComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const [employees, setEmployees] = useState([]);
    const [delegations, setDelegations] = useState([]);
    const [scheduleServices, setScheduleServices] = useState([]);
    const [scheduleServiceId, setScheduleServiceId] = useState('');
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleMonth, setScheduleMonth] = useState(() =>
        new Date().toISOString().slice(0, 7)
    );
    const [scheduleStartDate, setScheduleStartDate] = useState('');
    const [scheduleEndDate, setScheduleEndDate] = useState('');
    const [scheduleServiceStatus, setScheduleServiceStatus] = useState(
        'confirmed'
    );
    const [scheduleShiftStatus, setScheduleShiftStatus] = useState('');
    const [scheduleEmployeeFilter, setScheduleEmployeeFilter] =
        useState('');
    const [scheduleServiceFilter, setScheduleServiceFilter] = useState('');
    const [scheduleDelegationFilter, setScheduleDelegationFilter] =
        useState('');
    const [scheduleOverviewLoading, setScheduleOverviewLoading] =
        useState(false);
    const [scheduleCards, setScheduleCards] = useState([]);
    const [scheduleShiftMap, setScheduleShiftMap] = useState({});
    const [personalModal, setPersonalModal] = useState(null);
    const [scheduleViewMode, setScheduleViewMode] = useState('services');
    const [isDownloadingServicePdf, setIsDownloadingServicePdf] = useState(false);
    const [isDownloadingServiceZip, setIsDownloadingServiceZip] = useState(false);
    const [isDownloadingPersonalZip, setIsDownloadingPersonalZip] = useState(false);
    const [downloadingPersonalId, setDownloadingPersonalId] = useState('');

    const schedulePanelRef = useRef(null);

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
        const loadScheduleServices = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                setScheduleLoading(true);
                const params = new URLSearchParams();
                if (scheduleServiceStatus) {
                    params.append('status', scheduleServiceStatus);
                }
                if (scheduleDelegationFilter) {
                    params.append('delegationId', scheduleDelegationFilter);
                }
                if (scheduleStartDate) {
                    params.append('startDateFrom', scheduleStartDate);
                }
                if (scheduleEndDate) {
                    params.append('startDateTo', scheduleEndDate);
                }
                const data = await fetchAllServicesServices(
                    params.toString(),
                    authToken
                );
                const list = Array.isArray(data)
                    ? data
                    : data?.data || [];
                const normalized = list.map((service) => ({
                    ...service,
                    id: service?.id || service?.serviceId || '',
                }));
                setScheduleServices(
                    normalized.filter(
                        (service) =>
                            typeof service?.id === 'string' &&
                            service.id.length === 36
                    )
                );
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar servicios'
                );
            } finally {
                setScheduleLoading(false);
            }
        };

        loadScheduleServices();
    }, [
        authToken,
        isAdminLike,
        scheduleServiceStatus,
        scheduleDelegationFilter,
        scheduleStartDate,
        scheduleEndDate,
    ]);

    useEffect(() => {
        const loadScheduleOverview = async () => {
            if (!authToken || !isAdminLike) return;
            if (!scheduleServices.length) {
                setScheduleCards([]);
                setScheduleShiftMap({});
                return;
            }

            try {
                setScheduleOverviewLoading(true);
                const cards = [];
                const shiftMap = {};
                const filteredServices = scheduleServiceFilter
                    ? scheduleServices.filter(
                          (service) => service.id === scheduleServiceFilter
                      )
                    : scheduleServices;

                await Promise.all(
                    filteredServices.map(async (service) => {
                        if (!service?.id || service.id.length !== 36) {
                            return;
                        }
                        const shifts = await fetchServiceScheduleShifts(
                            authToken,
                            service.id,
                            scheduleMonth
                        );

                        const filteredShifts = (shifts || []).filter(
                            (shift) => {
                                if (
                                    scheduleShiftStatus &&
                                    shift.status !== scheduleShiftStatus
                                ) {
                                    return false;
                                }
                                if (
                                    scheduleEmployeeFilter &&
                                    shift.employeeId !== scheduleEmployeeFilter
                                ) {
                                    return false;
                                }
                                if (scheduleStartDate || scheduleEndDate) {
                                    const shiftDate =
                                        typeof shift.scheduleDate === 'string'
                                            ? shift.scheduleDate
                                            : new Date(shift.scheduleDate)
                                                  .toISOString()
                                                  .slice(0, 10);
                                    if (
                                        scheduleStartDate &&
                                        shiftDate < scheduleStartDate
                                    ) {
                                        return false;
                                    }
                                    if (
                                        scheduleEndDate &&
                                        shiftDate > scheduleEndDate
                                    ) {
                                        return false;
                                    }
                                }
                                return true;
                            }
                        );

                        shiftMap[service.id] = filteredShifts;

                        const templates =
                            await fetchServiceScheduleTemplates(
                                authToken,
                                service.id,
                                scheduleMonth
                            );
                        const templateApplied =
                            Array.isArray(templates) && templates.length > 0;

                        const employeeSet = new Set();
                        let totalHours = 0;
                        filteredShifts.forEach((shift) => {
                            if (shift.employeeId) {
                                employeeSet.add(shift.employeeId);
                            }
                            totalHours += Number(shift.hours) || 0;
                        });

                        cards.push({
                            id: service.id,
                            name: service.name,
                            month: scheduleMonth,
                            shiftCount: filteredShifts.length,
                            employeeCount: employeeSet.size,
                            totalHours,
                            templateApplied,
                        });
                    })
                );

                setScheduleCards(cards);
                setScheduleShiftMap(shiftMap);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar cuadrantes'
                );
            } finally {
                setScheduleOverviewLoading(false);
            }
        };

        loadScheduleOverview();
    }, [
        authToken,
        isAdminLike,
        scheduleServices,
        scheduleMonth,
        scheduleShiftStatus,
        scheduleEmployeeFilter,
        scheduleServiceFilter,
        scheduleStartDate,
        scheduleEndDate,
    ]);

    const serviceNameMap = useMemo(() => {
        return new Map(
            scheduleServices.map((service) => [service.id, service.name])
        );
    }, [scheduleServices]);


    const personalScheduleRows = useMemo(() => {
        const shiftRows = Object.values(scheduleShiftMap).flat();
        const employeeMap = new Map();

        shiftRows.forEach((shift) => {
            if (!shift.employeeId) return;
            if (!employeeMap.has(shift.employeeId)) {
                const employee = employees.find(
                    (item) => item.id === shift.employeeId
                );
                employeeMap.set(shift.employeeId, {
                    id: shift.employeeId,
                    name: employee
                        ? `${employee.firstName} ${employee.lastName}`
                        : 'Empleado',
                    shifts: [],
                });
            }
            employeeMap.get(shift.employeeId).shifts.push(shift);
        });

        return Array.from(employeeMap.values()).map((item) => {
            const totalHours = item.shifts.reduce(
                (acc, shift) => acc + (Number(shift.hours) || 0),
                0
            );
            return {
                ...item,
                totalHours,
            };
        });
    }, [scheduleShiftMap, employees]);

    const handleScheduleReset = () => {
        setScheduleMonth(new Date().toISOString().slice(0, 7));
        setScheduleStartDate('');
        setScheduleEndDate('');
        setScheduleServiceStatus('confirmed');
        setScheduleShiftStatus('');
        setScheduleEmployeeFilter('');
        setScheduleServiceFilter('');
        setScheduleDelegationFilter('');
    };

    const triggerDownload = ({ blob, fileName }) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'archivo.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleServicePdfDownload = async () => {
        if (!authToken || !scheduleServiceId) return;
        try {
            setIsDownloadingServicePdf(true);
            const data = await downloadServiceSchedulePdf(
                authToken,
                scheduleServiceId,
                scheduleMonth
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el PDF');
        } finally {
            setIsDownloadingServicePdf(false);
        }
    };

    const handleServiceZipDownload = async () => {
        if (!authToken) return;
        const serviceIds = scheduleCards.map((card) => card.id).filter(Boolean);
        if (!serviceIds.length) {
            toast.error('No hay cuadrantes para descargar');
            return;
        }
        try {
            setIsDownloadingServiceZip(true);
            const data = await downloadServiceScheduleZip(
                authToken,
                serviceIds,
                scheduleMonth
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el ZIP');
        } finally {
            setIsDownloadingServiceZip(false);
        }
    };

    const handlePersonalZipDownload = async () => {
        if (!authToken) return;
        const employeeIds = personalScheduleRows.map((row) => row.id).filter(Boolean);
        if (!employeeIds.length) {
            toast.error('No hay cuadrantes personales para descargar');
            return;
        }
        try {
            setIsDownloadingPersonalZip(true);
            const data = await downloadEmployeeScheduleZip(
                authToken,
                scheduleMonth,
                employeeIds
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el ZIP');
        } finally {
            setIsDownloadingPersonalZip(false);
        }
    };

    const handlePersonalPdfDownload = async (employeeId) => {
        if (!authToken || !employeeId) return;
        try {
            setDownloadingPersonalId(employeeId);
            const data = await downloadEmployeeSchedulePdf(
                authToken,
                scheduleMonth,
                employeeId
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el PDF');
        } finally {
            setDownloadingPersonalId('');
        }
    };

    if (!isAdminLike) {
        return (
            <section className='schedule-section'>
                <p className='schedule-empty'>
                    Acceso restringido a administradores.
                </p>
            </section>
        );
    }

    return (
        <section className='schedule-section'>
            <div className='schedule-header'>
                <div>
                    <h1>Cuadrantes</h1>
                    <p>Gestiona cuadrantes por servicio y empleados.</p>
                </div>
                <button
                    type='button'
                    className='schedule-btn schedule-btn--ghost'
                    onClick={handleScheduleReset}
                >
                    Limpiar filtros
                </button>
            </div>

            <div className='schedule-filters'>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleMonth'>Mes</label>
                    <input
                        id='scheduleMonth'
                        type='month'
                        value={scheduleMonth}
                        onChange={(e) => setScheduleMonth(e.target.value)}
                    />
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleStart'>Desde</label>
                    <input
                        id='scheduleStart'
                        type='date'
                        value={scheduleStartDate}
                        onChange={(e) =>
                            setScheduleStartDate(e.target.value)
                        }
                    />
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleEnd'>Hasta</label>
                    <input
                        id='scheduleEnd'
                        type='date'
                        value={scheduleEndDate}
                        onChange={(e) =>
                            setScheduleEndDate(e.target.value)
                        }
                    />
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleServiceStatus'>
                        Estado servicio
                    </label>
                    <select
                        id='scheduleServiceStatus'
                        value={scheduleServiceStatus}
                        onChange={(e) =>
                            setScheduleServiceStatus(e.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        <option value='confirmed'>Confirmado</option>
                        <option value='pending'>Pendiente</option>
                        <option value='completed'>Completado</option>
                        <option value='canceled'>Cancelado</option>
                        <option value='accepted'>Aceptado</option>
                        <option value='rejected'>Rechazado</option>
                    </select>
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleShiftStatus'>Estado turno</label>
                    <select
                        id='scheduleShiftStatus'
                        value={scheduleShiftStatus}
                        onChange={(e) =>
                            setScheduleShiftStatus(e.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        <option value='scheduled'>Programado</option>
                        <option value='completed'>Completado</option>
                        <option value='canceled'>Cancelado</option>
                    </select>
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleServiceFilter'>Servicio</label>
                    <select
                        id='scheduleServiceFilter'
                        value={scheduleServiceFilter}
                        onChange={(e) =>
                            setScheduleServiceFilter(e.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {scheduleServices.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleEmployeeFilter'>Empleado</label>
                    <select
                        id='scheduleEmployeeFilter'
                        value={scheduleEmployeeFilter}
                        onChange={(e) =>
                            setScheduleEmployeeFilter(e.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='schedule-filter'>
                    <label htmlFor='scheduleDelegationFilter'>
                        Delegacion
                    </label>
                    <select
                        id='scheduleDelegationFilter'
                        value={scheduleDelegationFilter}
                        onChange={(e) =>
                            setScheduleDelegationFilter(e.target.value)
                        }
                    >
                        <option value=''>Todas</option>
                        {delegations.map((delegation) => (
                            <option key={delegation.id} value={delegation.id}>
                                {delegation.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className='schedule-toggle'>
                <button
                    type='button'
                    className={`btn schedule-toggle-btn ${
                        scheduleViewMode === 'services'
                            ? 'btn-primary'
                            : 'btn-secondary'
                    }`}
                    onClick={() => setScheduleViewMode('services')}
                >
                    Cuadrantes por servicio
                </button>
                <button
                    type='button'
                    className={`btn schedule-toggle-btn ${
                        scheduleViewMode === 'personal'
                            ? 'btn-primary'
                            : 'btn-secondary'
                    }`}
                    onClick={() => setScheduleViewMode('personal')}
                >
                    Cuadrantes personales
                </button>
            </div>

            <div className='schedule-downloads'>
                {scheduleViewMode === 'services' ? (
                    <>
                        <button
                            type='button'
                            className='schedule-btn schedule-btn--ghost'
                            onClick={handleServicePdfDownload}
                            disabled={!scheduleServiceId || isDownloadingServicePdf}
                        >
                            {isDownloadingServicePdf ? 'Generando...' : 'PDF servicio'}
                        </button>
                        <button
                            type='button'
                            className='schedule-btn'
                            onClick={handleServiceZipDownload}
                            disabled={!scheduleCards.length || isDownloadingServiceZip}
                        >
                            {isDownloadingServiceZip ? 'Generando...' : 'ZIP servicios'}
                        </button>
                    </>
                ) : (
                    <button
                        type='button'
                        className='schedule-btn schedule-btn--ghost'
                        onClick={handlePersonalZipDownload}
                        disabled={!personalScheduleRows.length || isDownloadingPersonalZip}
                    >
                        {isDownloadingPersonalZip ? 'Generando...' : 'ZIP personales'}
                    </button>
                )}
            </div>

            {scheduleViewMode === 'services' ? (
                <>
                    <div className='schedule-cards'>
                        {scheduleOverviewLoading ? (
                            <p className='schedule-empty'>Cargando cuadrantes...</p>
                        ) : scheduleCards.length ? (
                            scheduleCards.map((card) => (
                                <div key={card.id} className='schedule-card'>
                                    <div>
                                        <h3>{card.name}</h3>
                                        <p>Mes: {card.month}</p>
                                    </div>
                                    <div className='schedule-card-meta'>
                                        <span>Turnos: {card.shiftCount}</span>
                                        <span>Empleados: {card.employeeCount}</span>
                                        <span>
                                            Horas: {card.totalHours.toFixed(2)}
                                        </span>
                                        <span>
                                            Plantilla:{' '}
                                            {card.templateApplied
                                                ? 'Aplicada'
                                                : 'Sin plantilla'}
                                        </span>
                                    </div>
                                    <button
                                        type='button'
                                        className='schedule-btn schedule-btn--ghost'
                                        onClick={() => {
                                            setScheduleServiceId(card.id);
                                            schedulePanelRef.current?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start',
                                            });
                                        }}
                                    >
                                        Ver cuadrante
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className='schedule-empty'>
                                Sin cuadrantes disponibles.
                            </p>
                        )}
                    </div>

                    <div className='schedule-panel' ref={schedulePanelRef}>
                        <div className='schedule-panel-header'>
                            <div>
                                <h2>Cuadrante por servicio</h2>
                                <p>Selecciona un servicio para editar el mes.</p>
                            </div>
                            <div className='schedule-panel-select'>
                                <label htmlFor='scheduleService'>Servicio</label>
                                <select
                                    id='scheduleService'
                                    value={scheduleServiceId}
                                    onChange={(event) =>
                                        setScheduleServiceId(event.target.value)
                                    }
                                >
                                    <option value=''>
                                        {scheduleLoading
                                            ? 'Cargando...'
                                            : 'Selecciona un servicio'}
                                    </option>
                                    {scheduleServices.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {scheduleServiceId ? (
                            <ServiceSchedulePanel
                                serviceId={scheduleServiceId}
                                authToken={authToken}
                            />
                        ) : (
                            <p className='schedule-empty'>
                                Selecciona un servicio para ver el cuadrante.
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <div className='schedule-personal'>
                    <div className='schedule-personal-header'>
                        <div>
                            <h2>Cuadrantes personales</h2>
                            <p>Revisa el cuadrante individual del mes.</p>
                        </div>
                    </div>
                    {personalScheduleRows.length ? (
                        <div className='schedule-personal-list'>
                            {personalScheduleRows.map((item) => (
                                <div key={item.id} className='schedule-personal-row'>
                                    <div>
                                        <strong>{item.name}</strong>
                                        <span>
                                            Turnos: {item.shifts.length} | Horas:{' '}
                                            {item.totalHours.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className='schedule-personal-actions'>
                                        <button
                                            type='button'
                                            className='schedule-btn schedule-btn--ghost'
                                            onClick={() => handlePersonalPdfDownload(item.id)}
                                            disabled={downloadingPersonalId === item.id}
                                        >
                                            {downloadingPersonalId === item.id
                                                ? 'Generando...'
                                                : 'PDF'}
                                        </button>
                                        <button
                                            type='button'
                                            className='schedule-btn'
                                            onClick={() => setPersonalModal(item)}
                                        >
                                            Ver cuadrante
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='schedule-empty'>
                            Sin cuadrantes personales.
                        </p>
                    )}
                </div>
            )}

            {personalModal && (
                <div className='service-schedule-grid-modal'>
                    <button
                        type='button'
                        className='service-schedule-grid-modal__backdrop'
                        onClick={() => setPersonalModal(null)}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='service-schedule-grid-modal__panel'>
                        <div className='service-schedule-grid-modal__header'>
                            <div>
                                <h3>Cuadrante personal</h3>
                                <p>{personalModal.name}</p>
                            </div>
                            <button
                                type='button'
                                className='service-schedule-grid-modal__close'
                                onClick={() => setPersonalModal(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='service-schedule-grid-modal__body'>
                            <ServiceScheduleGrid
                                month={scheduleMonth}
                                shifts={personalModal.shifts.map((shift) => ({
                                    ...shift,
                                    employeeId: shift.serviceId,
                                }))}
                                employees={personalModal.shifts.reduce(
                                    (acc, shift) => {
                                        if (!shift.serviceId) return acc;
                                        if (
                                            acc.some(
                                                (row) =>
                                                    row.id === shift.serviceId
                                            )
                                        ) {
                                            return acc;
                                        }
                                        return [
                                            ...acc,
                                            {
                                                id: shift.serviceId,
                                                firstName:
                                                    shift.serviceName ||
                                                    serviceNameMap.get(
                                                        shift.serviceId
                                                    ) ||
                                                    '',
                                                lastName: '',
                                            },
                                        ];
                                    },
                                    []
                                )}
                                absencesByEmployee={{}}
                                onShiftUpdate={() => {}}
                                readOnly
                                showUnassigned={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ScheduleComponent;
