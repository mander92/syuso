import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchAllUsersServices,
    fetchEmployeeAbsences,
    fetchEmployeeRules,
    updateEmployeeRules,
    createEmployeeAbsence,
    deleteEmployeeAbsence,
} from '../../services/userService.js';
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
    const [employeeRulesMap, setEmployeeRulesMap] = useState({});
    const [employeeAbsencesMap, setEmployeeAbsencesMap] = useState({});
    const [employeePanelsOpen, setEmployeePanelsOpen] = useState({});
    const [rulesSavingId, setRulesSavingId] = useState('');
    const [absenceSavingId, setAbsenceSavingId] = useState('');
    const [absenceDrafts, setAbsenceDrafts] = useState({});

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

    const filteredEmployees = useMemo(() => {
        if (!employees.length) return [];
        if (!scheduleEmployeeFilter) return employees;
        return employees.filter((employee) => employee.id === scheduleEmployeeFilter);
    }, [employees, scheduleEmployeeFilter]);

    const getMonthRange = () => {
        if (!scheduleMonth) return null;
        const [year, monthValue] = scheduleMonth.split('-').map(Number);
        const start = new Date(Date.UTC(year, monthValue - 1, 1));
        const end = new Date(Date.UTC(year, monthValue, 0, 23, 59, 59));
        return { start, end };
    };

    const isWithinMonth = (dateValue, range) => {
        if (!dateValue || !range) return false;
        const date = new Date(dateValue);
        return date >= range.start && date <= range.end;
    };

    const isAbsenceInRange = (absence, range) => {
        if (!absence || !range) return false;
        const start = absence.startDate ? new Date(absence.startDate) : null;
        const end = absence.endDate ? new Date(absence.endDate) : null;
        if (!start && !end) return false;
        const startDate = start || end;
        const endDate = end || start;
        return startDate <= range.end && endDate >= range.start;
    };

    const monthRange = useMemo(() => getMonthRange(), [scheduleMonth]);

    const countAbsenceDays = (absences, type, range) => {
        if (!range || !Array.isArray(absences)) return 0;
        return absences.reduce((total, absence) => {
            if (!absence) return total;
            const normalizedType =
                absence.type === 'leave' ? 'free' : absence.type;
            if (normalizedType !== type) return total;
            const start = absence.startDate ? new Date(absence.startDate) : null;
            const end = absence.endDate ? new Date(absence.endDate) : null;
            if (!start && !end) return total;
            const startDate = start || end;
            const endDate = end || start;
            const rangeStart = new Date(
                Date.UTC(
                    range.start.getUTCFullYear(),
                    range.start.getUTCMonth(),
                    range.start.getUTCDate()
                )
            );
            const rangeEnd = new Date(
                Date.UTC(
                    range.end.getUTCFullYear(),
                    range.end.getUTCMonth(),
                    range.end.getUTCDate()
                )
            );
            const absStart = new Date(
                Date.UTC(
                    startDate.getUTCFullYear(),
                    startDate.getUTCMonth(),
                    startDate.getUTCDate()
                )
            );
            const absEnd = new Date(
                Date.UTC(
                    endDate.getUTCFullYear(),
                    endDate.getUTCMonth(),
                    endDate.getUTCDate()
                )
            );
            const overlapStart = absStart > rangeStart ? absStart : rangeStart;
            const overlapEnd = absEnd < rangeEnd ? absEnd : rangeEnd;
            if (overlapStart > overlapEnd) return total;
            const diffDays =
                Math.floor(
                    (overlapEnd.getTime() - overlapStart.getTime()) /
                        (24 * 60 * 60 * 1000)
                ) + 1;
            return total + diffDays;
        }, 0);
    };

    useEffect(() => {
        const loadRulesAndAbsences = async () => {
            if (!authToken || !isAdminLike || scheduleViewMode !== 'personal')
                return;

            const list = filteredEmployees;
            if (!list.length) return;

            try {
                const rulesEntries = await Promise.all(
                    list.map(async (employee) => {
                        try {
                            const rules = await fetchEmployeeRules(
                                authToken,
                                employee.id
                            );
                            return [employee.id, rules];
                        } catch (error) {
                            return [employee.id, null];
                        }
                    })
                );

                const absencesEntries = await Promise.all(
                    list.map(async (employee) => {
                        try {
                            const absences = await fetchEmployeeAbsences(
                                authToken,
                                employee.id
                            );
                            return [employee.id, absences || []];
                        } catch (error) {
                            return [employee.id, []];
                        }
                    })
                );

                setEmployeeRulesMap(Object.fromEntries(rulesEntries));
                setEmployeeAbsencesMap(Object.fromEntries(absencesEntries));
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar reglas');
            }
        };

        loadRulesAndAbsences();
    }, [authToken, isAdminLike, scheduleViewMode, filteredEmployees, scheduleMonth]);


    const personalScheduleRows = useMemo(() => {
        const shiftRows = Object.values(scheduleShiftMap).flat();
        const employeeMap = new Map();

        shiftRows.forEach((shift) => {
            if (!shift.employeeId) return;
            if (!employeeMap.has(shift.employeeId)) {
                employeeMap.set(shift.employeeId, []);
            }
            employeeMap.get(shift.employeeId).push(shift);
        });

        return filteredEmployees.map((employee) => {
            const shifts = employeeMap.get(employee.id) || [];
            const totalHours = shifts.reduce(
                (acc, shift) => acc + (Number(shift.hours) || 0),
                0
            );
            return {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                shifts,
                totalHours,
            };
        });
    }, [scheduleShiftMap, filteredEmployees]);

    const handleRuleChange = (employeeId, field, value) => {
        setEmployeeRulesMap((prev) => ({
            ...prev,
            [employeeId]: {
                ...(prev[employeeId] || {}),
                [field]: value,
            },
        }));
    };

    const handleRulesSave = async (employeeId) => {
        if (!authToken || !employeeId) return;
        const currentRules = employeeRulesMap[employeeId] || {};
        const payload = {
            minMonthlyHours:
                currentRules.minMonthlyHours === ''
                    ? null
                    : Number(currentRules.minMonthlyHours) || null,
            maxMonthlyHours:
                currentRules.maxMonthlyHours === ''
                    ? null
                    : Number(currentRules.maxMonthlyHours) || null,
            minRestHours:
                currentRules.minRestHours === ''
                    ? null
                    : Number(currentRules.minRestHours) || null,
            restWeekendType: currentRules.restWeekendType || 'short',
            restWeekendCount:
                currentRules.restWeekendCount === ''
                    ? null
                    : Number(currentRules.restWeekendCount) || null,
        };

        try {
            setRulesSavingId(employeeId);
            const saved = await updateEmployeeRules(authToken, employeeId, payload);
            setEmployeeRulesMap((prev) => ({
                ...prev,
                [employeeId]: {
                    ...prev[employeeId],
                    ...saved,
                },
            }));
            toast.success('Reglas guardadas');
        } catch (error) {
            toast.error(error.message || 'No se pudieron guardar las reglas');
        } finally {
            setRulesSavingId('');
        }
    };

    const handleAbsenceDraftChange = (employeeId, field, value) => {
        setAbsenceDrafts((prev) => ({
            ...prev,
            [employeeId]: {
                type: 'free',
                startDate: '',
                endDate: '',
                notes: '',
                ...(prev[employeeId] || {}),
                [field]: value,
            },
        }));
    };

    const handleCreateAbsence = async (employeeId) => {
        if (!authToken || !employeeId) return;
        const draft = absenceDrafts[employeeId] || {};
        if (!draft.startDate || !draft.endDate) {
            toast.error('Selecciona fecha inicio y fin');
            return;
        }

        try {
            setAbsenceSavingId(employeeId);
            const created = await createEmployeeAbsence(authToken, employeeId, {
                startDate: draft.startDate,
                endDate: draft.endDate,
                type: draft.type || 'free',
                notes: draft.notes || '',
            });
            setEmployeeAbsencesMap((prev) => ({
                ...prev,
                [employeeId]: [...(prev[employeeId] || []), created],
            }));
            setAbsenceDrafts((prev) => ({
                ...prev,
                [employeeId]: {
                    type: draft.type || 'free',
                    startDate: '',
                    endDate: '',
                    notes: '',
                },
            }));
            toast.success('Ausencia guardada');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar la ausencia');
        } finally {
            setAbsenceSavingId('');
        }
    };

    const handleDeleteAbsence = async (employeeId, absenceId) => {
        if (!authToken || !employeeId || !absenceId) return;
        try {
            await deleteEmployeeAbsence(authToken, employeeId, absenceId);
            setEmployeeAbsencesMap((prev) => ({
                ...prev,
                [employeeId]: (prev[employeeId] || []).filter(
                    (absence) => absence.id !== absenceId
                ),
            }));
            toast.success('Ausencia eliminada');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar la ausencia');
        }
    };

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
                            {personalScheduleRows.map((item) => {
                                const rules = employeeRulesMap[item.id] || {};
                                const absences = employeeAbsencesMap[item.id] || [];
                                const monthAbsences = absences.filter((absence) =>
                                    isAbsenceInRange(absence, monthRange)
                                );
                                const draft = absenceDrafts[item.id] || {
                                    type: 'free',
                                    startDate: '',
                                    endDate: '',
                                    notes: '',
                                };
                                const panelOpen =
                                    employeePanelsOpen[item.id] !== undefined
                                        ? employeePanelsOpen[item.id]
                                        : false;
                                const freeDays = countAbsenceDays(
                                    monthAbsences,
                                    'free',
                                    monthRange
                                );
                                const vacationDays = countAbsenceDays(
                                    monthAbsences,
                                    'vacation',
                                    monthRange
                                );
                                const sickDays = countAbsenceDays(
                                    monthAbsences,
                                    'sick',
                                    monthRange
                                );
                                const availableDays = countAbsenceDays(
                                    monthAbsences,
                                    'available',
                                    monthRange
                                );

                                return (
                                <div key={item.id} className='schedule-personal-row'>
                                    <div className='schedule-personal-summary'>
                                        <strong>{item.name}</strong>
                                        <span>
                                            Turnos: {item.shifts.length} | Horas:{' '}
                                            {item.totalHours.toFixed(2)}
                                        </span>
                                        <span>
                                            Ausencias: {freeDays + vacationDays + sickDays} dias
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
                                        <button
                                            type='button'
                                            className='schedule-btn schedule-btn--ghost'
                                            onClick={() =>
                                                setEmployeePanelsOpen((prev) => ({
                                                    ...prev,
                                                    [item.id]: !panelOpen,
                                                }))
                                            }
                                        >
                                            {panelOpen
                                                ? 'Ocultar reglas'
                                                : 'Reglas y ausencias'}
                                        </button>
                                    </div>
                                    {panelOpen ? (
                                        <div className='schedule-personal-panel'>
                                            <div className='schedule-personal-block'>
                                                <div className='schedule-personal-block__header'>
                                                    <h4>Reglas mensuales</h4>
                                                    <button
                                                        type='button'
                                                        className='schedule-btn'
                                                        onClick={() =>
                                                            handleRulesSave(item.id)
                                                        }
                                                        disabled={rulesSavingId === item.id}
                                                    >
                                                        {rulesSavingId === item.id
                                                            ? 'Guardando...'
                                                            : 'Guardar reglas'}
                                                    </button>
                                                </div>
                                                <div className='schedule-personal-rule-grid'>
                                                    <label>
                                                        Min. horas/mes
                                                        <input
                                                            type='number'
                                                            min='0'
                                                            value={
                                                                rules.minMonthlyHours ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                handleRuleChange(
                                                                    item.id,
                                                                    'minMonthlyHours',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label>
                                                        Max. horas/mes
                                                        <input
                                                            type='number'
                                                            min='0'
                                                            value={
                                                                rules.maxMonthlyHours ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                handleRuleChange(
                                                                    item.id,
                                                                    'maxMonthlyHours',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label>
                                                        Descanso minimo (h)
                                                        <input
                                                            type='number'
                                                            min='0'
                                                            value={rules.minRestHours ?? ''}
                                                            onChange={(event) =>
                                                                handleRuleChange(
                                                                    item.id,
                                                                    'minRestHours',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label>
                                                        Fin de semana descanso
                                                        <select
                                                            value={
                                                                rules.restWeekendType ||
                                                                'short'
                                                            }
                                                            onChange={(event) =>
                                                                handleRuleChange(
                                                                    item.id,
                                                                    'restWeekendType',
                                                                    event.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value='short'>
                                                                Corto (S-D)
                                                            </option>
                                                            <option value='long'>
                                                                Largo (V-S-D)
                                                            </option>
                                                        </select>
                                                    </label>
                                                    <label>
                                                        Cantidad/mes
                                                        <input
                                                            type='number'
                                                            min='0'
                                                            value={
                                                                rules.restWeekendCount ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                handleRuleChange(
                                                                    item.id,
                                                                    'restWeekendCount',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className='schedule-personal-block'>
                                                <div className='schedule-personal-block__header'>
                                                    <h4>Vacaciones y libres</h4>
                                                    <div className='schedule-personal-block__meta'>
                                                        <span>
                                                            Mes: {scheduleMonth || '—'}
                                                        </span>
                                                        <span>Libres: {freeDays}</span>
                                                        <span>
                                                            Vacaciones: {vacationDays}
                                                        </span>
                                                        <span>Bajas: {sickDays}</span>
                                                        <span>
                                                            Disponibles: {availableDays}
                                                        </span>
                                                    </div>
                                                </div>
                                                {monthAbsences.length ? (
                                                    <div className='schedule-personal-absence-list'>
                                                        {monthAbsences.map((absence) => (
                                                            <div
                                                                key={absence.id}
                                                                className='schedule-personal-absence-item'
                                                            >
                                                                <div>
                                                                    <strong>
                                                                        {absence.type ===
                                                                        'vacation'
                                                                            ? 'Vacaciones'
                                                                            : absence.type ===
                                                                              'sick'
                                                                            ? 'Baja'
                                                                            : absence.type ===
                                                                              'available'
                                                                            ? 'Disponible'
                                                                            : 'Libre'}
                                                                    </strong>
                                                                    <span>
                                                                        {absence.startDate} →{' '}
                                                                        {absence.endDate}
                                                                    </span>
                                                                    {absence.notes ? (
                                                                        <span className='schedule-personal-absence-notes'>
                                                                            {absence.notes}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                <button
                                                                    type='button'
                                                                    className='schedule-btn schedule-btn--ghost'
                                                                    onClick={() =>
                                                                        handleDeleteAbsence(
                                                                            item.id,
                                                                            absence.id
                                                                        )
                                                                    }
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className='schedule-personal-empty'>
                                                        Sin ausencias este mes.
                                                    </p>
                                                )}

                                                <div className='schedule-personal-absence-form'>
                                                    <label>
                                                        Inicio
                                                        <input
                                                            type='date'
                                                            value={draft.startDate || ''}
                                                            onChange={(event) =>
                                                                handleAbsenceDraftChange(
                                                                    item.id,
                                                                    'startDate',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label>
                                                        Fin
                                                        <input
                                                            type='date'
                                                            value={draft.endDate || ''}
                                                            onChange={(event) =>
                                                                handleAbsenceDraftChange(
                                                                    item.id,
                                                                    'endDate',
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label>
                                                        Tipo
                                                        <select
                                                            value={draft.type || 'free'}
                                                            onChange={(event) =>
                                                                handleAbsenceDraftChange(
                                                                    item.id,
                                                                    'type',
                                                                    event.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value='free'>Libre</option>
                                                            <option value='vacation'>
                                                                Vacaciones
                                                            </option>
                                                            <option value='sick'>Baja</option>
                                                            <option value='available'>
                                                                Disponible
                                                            </option>
                                                        </select>
                                                    </label>
                                                    <label className='schedule-personal-absence-notes-input'>
                                                        Nota
                                                        <input
                                                            type='text'
                                                            value={draft.notes || ''}
                                                            onChange={(event) =>
                                                                handleAbsenceDraftChange(
                                                                    item.id,
                                                                    'notes',
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder='Opcional'
                                                        />
                                                    </label>
                                                    <button
                                                        type='button'
                                                        className='schedule-btn'
                                                        onClick={() =>
                                                            handleCreateAbsence(item.id)
                                                        }
                                                        disabled={absenceSavingId === item.id}
                                                    >
                                                        {absenceSavingId === item.id
                                                            ? 'Guardando...'
                                                            : 'Anadir ausencia'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                );
                            })}
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
                            {(() => {
                                const absences =
                                    employeeAbsencesMap[personalModal.id] || [];
                                const absenceRowId = `absences-${personalModal.id}`;
                                const serviceRows = personalModal.shifts.reduce(
                                    (acc, shift) => {
                                        if (!shift.serviceId) return acc;
                                        if (
                                            acc.some(
                                                (row) => row.id === shift.serviceId
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
                                );
                                const employees = [
                                    {
                                        id: absenceRowId,
                                        firstName: 'Ausencias',
                                        lastName: '',
                                    },
                                    ...serviceRows,
                                ];
                                const serviceAbsenceMap = serviceRows.reduce(
                                    (acc, row) => {
                                        acc[row.id] = absences;
                                        return acc;
                                    },
                                    { [absenceRowId]: absences }
                                );
                                return (
                                    <ServiceScheduleGrid
                                        month={scheduleMonth}
                                        shifts={personalModal.shifts.map((shift) => ({
                                            ...shift,
                                            employeeId: shift.serviceId,
                                        }))}
                                        employees={employees}
                                        absencesByEmployee={serviceAbsenceMap}
                                        onShiftUpdate={() => {}}
                                        readOnly
                                        showUnassigned={false}
                                    />
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ScheduleComponent;
