import { useContext, useEffect, useMemo, useState } from 'react';
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
    downloadServiceScheduleExcel,
    downloadServiceScheduleZip,
    downloadServiceScheduleExcelZip,
    downloadEmployeeSchedulePdf,
    downloadEmployeeScheduleZip,
    fetchHolidays,
    createHoliday,
    deleteHoliday,
    simulateServiceSchedule,
    applyServiceScheduleSimulation,
    updateServiceScheduleShift,
} from '../../services/serviceService.js';
import ServiceSchedulePanel from '../serviceSchedule/ServiceSchedulePanel.jsx';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import '../button/Button.css';
import './ScheduleComponent.css';
import '../serviceSchedule/ServiceSchedulePanel.css';

const holidayScopeLabels = {
    national: 'Nacional',
    autonomous: 'Autonomico',
    local: 'Local',
};

const toLocalDateInput = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
};

const formatDateEs = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
};

const calculateShiftHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    if (
        [startHours, startMinutes, endHours, endMinutes].some((value) =>
            Number.isNaN(value)
        )
    ) {
        return '';
    }

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    const diffMinutes =
        endTotal >= startTotal
            ? endTotal - startTotal
            : endTotal + 24 * 60 - startTotal;
    return Math.round((diffMinutes / 60) * 100) / 100;
};

const ScheduleComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';
    const compareText = (a, b) =>
        String(a || '').localeCompare(String(b || ''), 'es', {
            sensitivity: 'base',
        });
    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();

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
    const [scheduleEmployeeFilter, setScheduleEmployeeFilter] =
        useState('');
    const [scheduleServiceFilter, setScheduleServiceFilter] = useState('');
    const [scheduleDelegationFilter, setScheduleDelegationFilter] =
        useState('');
    const [scheduleOverviewLoading, setScheduleOverviewLoading] =
        useState(false);
    const [scheduleCards, setScheduleCards] = useState([]);
    const [scheduleShiftMap, setScheduleShiftMap] = useState({});
    const [expandedScheduleDelegations, setExpandedScheduleDelegations] =
        useState({});
    const [expandedPersonalDelegations, setExpandedPersonalDelegations] =
        useState({});
    const [serviceScheduleModal, setServiceScheduleModal] = useState(null);
    const [serviceScheduleViewModal, setServiceScheduleViewModal] =
        useState(null);
    const [personalModal, setPersonalModal] = useState(null);
    const [scheduleViewMode, setScheduleViewMode] = useState('services');
    const [isDownloadingServicePdf, setIsDownloadingServicePdf] = useState(false);
    const [isDownloadingServiceExcel, setIsDownloadingServiceExcel] =
        useState(false);
    const [isDownloadingServiceZip, setIsDownloadingServiceZip] = useState(false);
    const [isDownloadingServiceExcelZip, setIsDownloadingServiceExcelZip] =
        useState(false);
    const [isDownloadingPersonalZip, setIsDownloadingPersonalZip] = useState(false);
    const [downloadingPersonalId, setDownloadingPersonalId] = useState('');
    const [employeeRulesMap, setEmployeeRulesMap] = useState({});
    const [employeeAbsencesMap, setEmployeeAbsencesMap] = useState({});
    const [employeePanelsOpen, setEmployeePanelsOpen] = useState({});
    const [rulesSavingId, setRulesSavingId] = useState('');
    const [absenceSavingId, setAbsenceSavingId] = useState('');
    const [absenceDrafts, setAbsenceDrafts] = useState({});
    const [holidays, setHolidays] = useState([]);
    const [holidayDraft, setHolidayDraft] = useState({
        holidayDate: toLocalDateInput(),
        scope: 'local',
        name: '',
    });
    const [isSavingHoliday, setIsSavingHoliday] = useState(false);
    const [isHolidayToolsOpen, setIsHolidayToolsOpen] = useState(false);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [isApplyingGeneratedSchedule, setIsApplyingGeneratedSchedule] =
        useState(false);
    const [generatedSchedulePreview, setGeneratedSchedulePreview] =
        useState(null);
    const [selectedGeneratedShift, setSelectedGeneratedShift] = useState(null);

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
                            type: service.type,
                            address: service.address,
                            delegation: service.province || 'Sin delegacion',
                            scheduleImage: service.scheduleImage || '',
                            scheduleView: service.scheduleView || 'grid',
                            autonomousCommunity:
                                service.autonomousCommunity || '',
                            province: service.province || '',
                            city: service.city || '',
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
        scheduleEmployeeFilter,
        scheduleServiceFilter,
        scheduleStartDate,
        scheduleEndDate,
    ]);

    useEffect(() => {
        const loadHolidays = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                const year = scheduleMonth
                    ? Number(scheduleMonth.slice(0, 4))
                    : new Date().getFullYear();
                const data = await fetchHolidays(authToken, { year });
                setHolidays(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar festivos');
            }
        };

        loadHolidays();
    }, [authToken, isAdminLike, scheduleMonth]);

    useEffect(() => {
        if (scheduleServiceFilter) {
            setScheduleServiceId(scheduleServiceFilter);
        }
    }, [scheduleServiceFilter]);

    const serviceNameMap = useMemo(() => {
        return new Map(
            scheduleServices.map((service) => [service.id, service.name])
        );
    }, [scheduleServices]);

    const scheduleCardsByDelegation = useMemo(() => {
        const groups = new Map();
        scheduleCards.forEach((card) => {
            const delegation = card.delegation || 'Sin delegacion';
            if (!groups.has(delegation)) groups.set(delegation, []);
            groups.get(delegation).push(card);
        });

        return [...groups.entries()]
            .sort(([a], [b]) => compareText(a, b))
            .map(([delegation, cards]) => ({
                delegation,
                cards: cards.sort((a, b) =>
                    compareText(a.name || a.type, b.name || b.type)
                ),
            }));
    }, [scheduleCards]);

    const toggleScheduleDelegation = (delegation) => {
        setExpandedScheduleDelegations((prev) => ({
            ...prev,
            [delegation]: !prev[delegation],
        }));
    };

    const setAllScheduleDelegationsExpanded = (expanded) => {
        setExpandedScheduleDelegations(
            Object.fromEntries(
                scheduleCardsByDelegation.map((group) => [
                    group.delegation,
                    expanded,
                ])
            )
        );
    };

    const openServiceScheduleModal = (card) => {
        setScheduleServiceId(card.id);
        setServiceScheduleModal(card);
    };

    const openServiceScheduleViewModal = (card) => {
        setScheduleServiceId(card.id);
        setServiceScheduleViewModal(card);
        setGeneratedSchedulePreview(null);
        setSelectedGeneratedShift(null);
    };

    const handleServiceScheduleViewMonthChange = async (monthValue) => {
        if (!serviceScheduleViewModal || !monthValue) return;

        const modal = serviceScheduleViewModal;
        setScheduleMonth(monthValue);
        setServiceScheduleViewModal((prev) =>
            prev ? { ...prev, month: monthValue } : prev
        );
        setGeneratedSchedulePreview(null);
        setSelectedGeneratedShift(null);

        try {
            const shifts = await fetchServiceScheduleShifts(
                authToken,
                modal.id,
                monthValue
            );
            setScheduleShiftMap((prev) => ({
                ...prev,
                [modal.id]: Array.isArray(shifts) ? shifts : [],
            }));
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar el mes');
        }
    };

    const handleGenerateServiceSchedule = async () => {
        if (!serviceScheduleViewModal) return;
        try {
            setIsGeneratingSchedule(true);
            const data = await simulateServiceSchedule(
                authToken,
                serviceScheduleViewModal.id,
                serviceScheduleViewModal.month
            );
            const generatedShifts = Array.isArray(data?.shifts)
                ? data.shifts
                : [];
            setGeneratedSchedulePreview(generatedShifts);
            setSelectedGeneratedShift(null);
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceScheduleViewModal.id]: generatedShifts,
            }));
            toast.success('Cuadrante generado en previsualizacion');
        } catch (error) {
            toast.error(error.message || 'No se pudo generar el cuadrante');
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleApplyGeneratedServiceSchedule = async () => {
        if (!serviceScheduleViewModal || !generatedSchedulePreview) return;
        try {
            setIsApplyingGeneratedSchedule(true);
            await applyServiceScheduleSimulation(
                authToken,
                serviceScheduleViewModal.id,
                serviceScheduleViewModal.month,
                generatedSchedulePreview
            );
            toast.success('Cuadrante aplicado');
            setGeneratedSchedulePreview(null);
            setSelectedGeneratedShift(null);
            const shifts = await fetchServiceScheduleShifts(
                authToken,
                serviceScheduleViewModal.id,
                serviceScheduleViewModal.month
            );
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceScheduleViewModal.id]: Array.isArray(shifts)
                    ? shifts
                    : [],
            }));
        } catch (error) {
            toast.error(error.message || 'No se pudo aplicar el cuadrante');
        } finally {
            setIsApplyingGeneratedSchedule(false);
        }
    };

    const updateGeneratedPreviewShift = (shiftId, updates) => {
        if (!serviceScheduleViewModal || !generatedSchedulePreview) return;
        const nextPreview = generatedSchedulePreview.map((shift) =>
            shift.id === shiftId ? { ...shift, ...updates } : shift
        );
        setGeneratedSchedulePreview(nextPreview);
        setScheduleShiftMap((prev) => ({
            ...prev,
            [serviceScheduleViewModal.id]: nextPreview,
        }));
        setSelectedGeneratedShift((prev) =>
            prev?.id === shiftId ? { ...prev, ...updates } : prev
        );
    };

    const handleGeneratedShiftUpdate = (shiftId, updates) => {
        updateGeneratedPreviewShift(shiftId, updates);
    };

    const updateSavedScheduleShiftInMap = (serviceId, shiftId, nextShift) => {
        if (!serviceId || !shiftId) return;
        setScheduleShiftMap((prev) => ({
            ...prev,
            [serviceId]: (prev[serviceId] || []).map((shift) =>
                shift.id === shiftId ? { ...shift, ...nextShift } : shift
            ),
        }));
        setSelectedGeneratedShift((prev) =>
            prev?.id === shiftId ? { ...prev, ...nextShift } : prev
        );
    };

    const handleScheduleViewShiftUpdate = async (shiftId, updates) => {
        if (generatedSchedulePreview) {
            updateGeneratedPreviewShift(shiftId, updates);
            return;
        }

        if (!serviceScheduleViewModal?.id || !shiftId) return;

        const serviceId = serviceScheduleViewModal.id;
        const currentShift = (scheduleShiftMap[serviceId] || []).find(
            (shift) => shift.id === shiftId
        );
        if (!currentShift) return;

        const optimisticShift = { ...currentShift, ...updates };
        updateSavedScheduleShiftInMap(serviceId, shiftId, optimisticShift);

        try {
            const data = await updateServiceScheduleShift(
                authToken,
                serviceId,
                shiftId,
                {
                    scheduleDate:
                        optimisticShift.scheduleDate ||
                        currentShift.scheduleDate,
                    startTime: optimisticShift.startTime || currentShift.startTime,
                    endTime: optimisticShift.endTime || currentShift.endTime,
                    hours:
                        optimisticShift.hours !== undefined
                            ? optimisticShift.hours
                            : currentShift.hours,
                    employeeId: optimisticShift.employeeId || null,
                    shiftTypeId: optimisticShift.shiftTypeId || null,
                }
            );
            updateSavedScheduleShiftInMap(serviceId, shiftId, data);
            toast.success('Turno actualizado');
        } catch (error) {
            updateSavedScheduleShiftInMap(serviceId, shiftId, currentShift);
            toast.error(error.message || 'No se pudo actualizar el turno');
        }
    };

    const handleGeneratedShiftFieldChange = (field, value) => {
        setSelectedGeneratedShift((prev) => {
            if (!prev) return prev;
            const next = { ...prev, [field]: value };
            if (field === 'startTime' || field === 'endTime') {
                const hours = calculateShiftHours(
                    field === 'startTime' ? value : next.startTime,
                    field === 'endTime' ? value : next.endTime
                );
                if (hours !== '') {
                    next.hours = hours;
                }
            }
            return next;
        });
    };

    const handleSaveGeneratedShift = async () => {
        if (!selectedGeneratedShift?.id) return;
        if (!generatedSchedulePreview) {
            await handleScheduleViewShiftUpdate(selectedGeneratedShift.id, {
                scheduleDate: String(
                    selectedGeneratedShift.scheduleDate || ''
                ).slice(0, 10),
                startTime: selectedGeneratedShift.startTime,
                endTime: selectedGeneratedShift.endTime,
                hours: selectedGeneratedShift.hours,
                employeeId: selectedGeneratedShift.employeeId || null,
                shiftTypeId: selectedGeneratedShift.shiftTypeId || null,
            });
            setSelectedGeneratedShift(null);
            return;
        }

        updateGeneratedPreviewShift(selectedGeneratedShift.id, {
            scheduleDate: selectedGeneratedShift.scheduleDate,
            startTime: selectedGeneratedShift.startTime,
            endTime: selectedGeneratedShift.endTime,
            hours: selectedGeneratedShift.hours,
            employeeId: selectedGeneratedShift.employeeId || null,
        });
        toast.success('Turno actualizado en previsualizacion');
        setSelectedGeneratedShift(null);
    };

    const buildServiceHolidaysByDate = (card) => {
        const serviceCommunity = normalizeText(card?.autonomousCommunity);
        const serviceCity = normalizeText(card?.city);
        const serviceProvince = normalizeText(card?.province || card?.delegation);
        const map = {};

        holidays
            .filter((holiday) => {
                if (holiday.scope === 'national') return true;
                if (holiday.scope === 'autonomous') {
                    return (
                        normalizeText(holiday.autonomousCommunity) ===
                        serviceCommunity
                    );
                }
                if (holiday.scope === 'local') {
                    const holidayCity = normalizeText(holiday.city);
                    const holidayProvince = normalizeText(holiday.province);
                    return (
                        (holidayCity && holidayCity === serviceCity) ||
                        (holidayProvince && holidayProvince === serviceProvince)
                    );
                }
                return false;
            })
            .forEach((holiday) => {
                const key = String(holiday.holidayDate || '').slice(0, 10);
                if (!key) return;
                if (!map[key]) map[key] = [];
                map[key].push(holiday);
            });

        return map;
    };

    const buildHolidayPayload = (card, holidayDate, scope, customName = '') => {
        const label = holidayScopeLabels[scope] || 'Festivo';
        return {
            holidayDate,
            scope,
            name: customName?.trim() || `Festivo ${label.toLowerCase()}`,
            autonomousCommunity:
                scope === 'autonomous' || scope === 'local'
                    ? card?.autonomousCommunity || ''
                    : null,
            province:
                scope === 'local'
                    ? card?.province || card?.delegation || ''
                    : null,
            city: scope === 'local' ? card?.city || '' : null,
        };
    };

    const handleCreateHoliday = async (event) => {
        event?.preventDefault();
        if (!serviceScheduleViewModal) return;
        if (!holidayDraft.holidayDate) {
            toast.error('Selecciona una fecha de festivo');
            return;
        }

        try {
            setIsSavingHoliday(true);
            const created = await createHoliday(
                authToken,
                buildHolidayPayload(
                    serviceScheduleViewModal,
                    holidayDraft.holidayDate,
                    holidayDraft.scope,
                    holidayDraft.name
                )
            );
            setHolidays((prev) => [...prev, created].filter(Boolean));
            setHolidayDraft((prev) => ({ ...prev, name: '' }));
            toast.success('Festivo anadido');
        } catch (error) {
            toast.error(error.message || 'No se pudo anadir el festivo');
        } finally {
            setIsSavingHoliday(false);
        }
    };

    const handleHolidayDrop = async (dateKey, scope) => {
        if (!serviceScheduleViewModal) return;
        try {
            const created = await createHoliday(
                authToken,
                buildHolidayPayload(serviceScheduleViewModal, dateKey, scope)
            );
            setHolidays((prev) => [...prev, created].filter(Boolean));
            toast.success(`Festivo ${holidayScopeLabels[scope] || ''} anadido`);
        } catch (error) {
            toast.error(error.message || 'No se pudo anadir el festivo');
        }
    };

    const handleHolidayClick = async (holiday) => {
        if (!holiday?.id) return;
        const shouldDelete = window.confirm(
            `Eliminar festivo "${holiday.name}" del ${formatDateEs(
                holiday.holidayDate
            )}?`
        );
        if (!shouldDelete) return;

        try {
            await deleteHoliday(authToken, holiday.id);
            setHolidays((prev) =>
                prev.filter((item) => item.id !== holiday.id)
            );
            toast.success('Festivo eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el festivo');
        }
    };

    useEffect(() => {
        if (!scheduleCardsByDelegation.length) {
            setExpandedScheduleDelegations({});
            return;
        }

        setExpandedScheduleDelegations((prev) => {
            const next = {};
            scheduleCardsByDelegation.forEach((group) => {
                next[group.delegation] = prev[group.delegation] ?? false;
            });
            return next;
        });
    }, [scheduleCardsByDelegation]);

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
                delegation: employee.delegations || employee.city || 'Sin delegacion',
                shifts,
                totalHours,
            };
        });
    }, [scheduleShiftMap, filteredEmployees]);

    const personalRowsByDelegation = useMemo(() => {
        const groups = new Map();
        personalScheduleRows.forEach((row) => {
            const delegation = row.delegation || 'Sin delegacion';
            if (!groups.has(delegation)) groups.set(delegation, []);
            groups.get(delegation).push(row);
        });

        return [...groups.entries()]
            .sort(([a], [b]) => compareText(a, b))
            .map(([delegation, rows]) => ({
                delegation,
                rows: rows.sort((a, b) => compareText(a.name, b.name)),
            }));
    }, [personalScheduleRows]);

    useEffect(() => {
        if (!personalRowsByDelegation.length) {
            setExpandedPersonalDelegations({});
            return;
        }

        setExpandedPersonalDelegations((prev) => {
            const next = {};
            personalRowsByDelegation.forEach((group) => {
                next[group.delegation] = prev[group.delegation] ?? false;
            });
            return next;
        });
    }, [personalRowsByDelegation]);

    const togglePersonalDelegation = (delegation) => {
        setExpandedPersonalDelegations((prev) => ({
            ...prev,
            [delegation]: !prev[delegation],
        }));
    };

    const personalScheduleDisplayRows = useMemo(() => {
        return personalRowsByDelegation.flatMap((group) => [
            {
                id: `delegation-${group.delegation}`,
                isDelegationHeader: true,
                delegation: group.delegation,
                count: group.rows.length,
            },
            ...(expandedPersonalDelegations[group.delegation]
                ? group.rows
                : []),
        ]);
    }, [personalRowsByDelegation, expandedPersonalDelegations]);

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

    const handleServiceExcelDownload = async () => {
        if (!authToken || !scheduleServiceId) return;
        try {
            setIsDownloadingServiceExcel(true);
            const data = await downloadServiceScheduleExcel(
                authToken,
                scheduleServiceId,
                scheduleMonth
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el Excel');
        } finally {
            setIsDownloadingServiceExcel(false);
        }
    };

    const handleServiceExcelZipDownload = async () => {
        if (!authToken) return;
        const serviceIds = scheduleCards.map((card) => card.id).filter(Boolean);
        if (!serviceIds.length) {
            toast.error('No hay cuadrantes para descargar');
            return;
        }
        try {
            setIsDownloadingServiceExcelZip(true);
            const data = await downloadServiceScheduleExcelZip(
                authToken,
                serviceIds,
                scheduleMonth
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el ZIP Excel');
        } finally {
            setIsDownloadingServiceExcelZip(false);
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
                            className='schedule-btn schedule-btn--ghost'
                            onClick={handleServiceExcelDownload}
                            disabled={
                                !scheduleServiceId || isDownloadingServiceExcel
                            }
                        >
                            {isDownloadingServiceExcel
                                ? 'Generando...'
                                : 'Excel servicio'}
                        </button>
                        <button
                            type='button'
                            className='schedule-btn'
                            onClick={handleServiceZipDownload}
                            disabled={!scheduleCards.length || isDownloadingServiceZip}
                        >
                            {isDownloadingServiceZip ? 'Generando...' : 'ZIP servicios'}
                        </button>
                        <button
                            type='button'
                            className='schedule-btn'
                            onClick={handleServiceExcelZipDownload}
                            disabled={
                                !scheduleCards.length || isDownloadingServiceExcelZip
                            }
                        >
                            {isDownloadingServiceExcelZip
                                ? 'Generando...'
                                : 'ZIP Excel'}
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
                    <div className='schedule-delegations'>
                        <div className='schedule-delegations-header'>
                            <div>
                                <h2>Cuadrantes por delegacion</h2>
                                <p>
                                    {scheduleCards.length} servicios con los filtros
                                    actuales.
                                </p>
                            </div>
                            <div className='schedule-delegations-actions'>
                                <button
                                    type='button'
                                    className='schedule-btn schedule-btn--ghost'
                                    onClick={() =>
                                        setAllScheduleDelegationsExpanded(false)
                                    }
                                >
                                    Plegar todo
                                </button>
                                <button
                                    type='button'
                                    className='schedule-btn'
                                    onClick={() =>
                                        setAllScheduleDelegationsExpanded(true)
                                    }
                                >
                                    Desplegar todo
                                </button>
                            </div>
                        </div>
                        {scheduleOverviewLoading ? (
                            <p className='schedule-empty'>Cargando cuadrantes...</p>
                        ) : scheduleCardsByDelegation.length ? (
                            <div className='schedule-delegation-list'>
                                {scheduleCardsByDelegation.map((group) => (
                                    <div
                                        className='schedule-delegation-group'
                                        key={group.delegation}
                                    >
                                        <button
                                            type='button'
                                            className='schedule-delegation-toggle'
                                            onClick={() =>
                                                toggleScheduleDelegation(
                                                    group.delegation
                                                )
                                            }
                                        >
                                            <span>{group.delegation}</span>
                                            <strong>
                                                {group.cards.length} servicios
                                            </strong>
                                            <span>
                                                {expandedScheduleDelegations[
                                                    group.delegation
                                                ]
                                                    ? 'Ocultar'
                                                    : 'Mostrar'}
                                            </span>
                                        </button>
                                        {expandedScheduleDelegations[
                                            group.delegation
                                        ] ? (
                                            <div className='schedule-cards'>
                                                {group.cards.map((card) => (
                                                    <div
                                                        key={card.id}
                                                        className='schedule-card'
                                                    >
                                                        <div>
                                                            <h3>
                                                                {card.name ||
                                                                    card.type ||
                                                                    'Servicio'}
                                                            </h3>
                                                            <p>
                                                                {card.address}
                                                                {card.address &&
                                                                card.city
                                                                    ? ', '
                                                                    : ''}
                                                                {card.city}
                                                            </p>
                                                            <p>Mes: {card.month}</p>
                                                        </div>
                                                        <div className='schedule-card-meta'>
                                                            <span>
                                                                Turnos:{' '}
                                                                {card.shiftCount}
                                                            </span>
                                                            <span>
                                                                Empleados:{' '}
                                                                {card.employeeCount}
                                                            </span>
                                                            <span>
                                                                Horas:{' '}
                                                                {card.totalHours.toFixed(
                                                                    2
                                                                )}
                                                            </span>
                                                            <span>
                                                                Plantilla:{' '}
                                                                {card.templateApplied
                                                                    ? 'Aplicada'
                                                                    : 'Sin plantilla'}
                                                            </span>
                                                        </div>
                                                        <div className='schedule-card-actions'>
                                                            <button
                                                                type='button'
                                                                className='schedule-btn schedule-btn--ghost'
                                                                onClick={() =>
                                                                    openServiceScheduleViewModal(
                                                                        card
                                                                    )
                                                                }
                                                            >
                                                                Ver cuadrante
                                                            </button>
                                                            <button
                                                                type='button'
                                                                className='schedule-btn'
                                                                onClick={() =>
                                                                    openServiceScheduleModal(
                                                                        card
                                                                    )
                                                                }
                                                            >
                                                                Ajustes
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='schedule-empty'>
                                Sin cuadrantes disponibles.
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
                    {personalRowsByDelegation.length ? (
                        <div className='schedule-personal-list'>
                            {personalScheduleDisplayRows.map((item) => {
                                if (item.isDelegationHeader) {
                                    return (
                                        <button
                                            key={item.id}
                                            type='button'
                                            className='schedule-delegation-toggle schedule-personal-delegation-toggle'
                                            onClick={() =>
                                                togglePersonalDelegation(
                                                    item.delegation
                                                )
                                            }
                                        >
                                            <span>{item.delegation}</span>
                                            <strong>{item.count} empleados</strong>
                                            <span>
                                                {expandedPersonalDelegations[
                                                    item.delegation
                                                ]
                                                    ? 'Ocultar'
                                                    : 'Mostrar'}
                                            </span>
                                        </button>
                                    );
                                }
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

            {serviceScheduleViewModal && (
                <div className='schedule-service-modal'>
                    <button
                        type='button'
                        className='schedule-service-modal__backdrop'
                        onClick={() => setServiceScheduleViewModal(null)}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='schedule-service-modal__panel'>
                        <div className='schedule-service-modal__header'>
                            <div>
                                <h3>
                                    {serviceScheduleViewModal.name ||
                                        serviceScheduleViewModal.type ||
                                        'Cuadrante por servicio'}
                                </h3>
                                <p>
                                    {serviceScheduleViewModal.delegation} -{' '}
                                    {serviceScheduleViewModal.month}
                                </p>
                            </div>
                            <div className='schedule-service-modal__header-actions'>
                                <label className='schedule-service-modal__month'>
                                    <span>Mes</span>
                                    <input
                                        type='month'
                                        value={serviceScheduleViewModal.month}
                                        onChange={(event) =>
                                            handleServiceScheduleViewMonthChange(
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    type='button'
                                    className='schedule-service-modal__settings'
                                    onClick={handleGenerateServiceSchedule}
                                    disabled={isGeneratingSchedule}
                                >
                                    {isGeneratingSchedule
                                        ? 'Generando...'
                                        : 'Generar cuadrante'}
                                </button>
                                {generatedSchedulePreview && (
                                    <button
                                        type='button'
                                        className='schedule-service-modal__apply'
                                        onClick={handleApplyGeneratedServiceSchedule}
                                        disabled={isApplyingGeneratedSchedule}
                                    >
                                        {isApplyingGeneratedSchedule
                                            ? 'Aplicando...'
                                            : 'Aplicar cuadrante'}
                                    </button>
                                )}
                                <button
                                    type='button'
                                    className='schedule-service-modal__settings'
                                    onClick={() =>
                                        setIsHolidayToolsOpen((prev) => !prev)
                                    }
                                >
                                    {isHolidayToolsOpen ? 'Ocultar festivos' : 'Festivos'}
                                </button>
                                <button
                                    type='button'
                                    className='schedule-service-modal__settings'
                                    onClick={() => {
                                        const card = serviceScheduleViewModal;
                                        setServiceScheduleViewModal(null);
                                        openServiceScheduleModal(card);
                                    }}
                                >
                                    Ajustes
                                </button>
                                <button
                                    type='button'
                                    className='schedule-service-modal__close'
                                    onClick={() =>
                                        setServiceScheduleViewModal(null)
                                    }
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                        <div className='schedule-service-modal__body'>
                            {generatedSchedulePreview && (
                                <div className='schedule-service-modal__preview-alert'>
                                    Previsualizacion generada. Revisa el cuadrante y pulsa
                                    Aplicar cuadrante para guardarlo.
                                </div>
                            )}
                            {isHolidayToolsOpen && (
                                <div className='service-schedule-holidays schedule-service-modal__holiday-tools'>
                                    <div className='service-schedule-holidays__header'>
                                        <div>
                                            <strong>Festivos</strong>
                                            <span>Marca dias especiales en el cuadrante.</span>
                                        </div>
                                    </div>
                                    <div className='service-schedule-holidays__content'>
                                        <form
                                            className='service-schedule-holidays__form'
                                            onSubmit={handleCreateHoliday}
                                        >
                                            <label>
                                                Festivo
                                                <input
                                                    type='date'
                                                    value={holidayDraft.holidayDate}
                                                    onChange={(event) =>
                                                        setHolidayDraft((prev) => ({
                                                            ...prev,
                                                            holidayDate:
                                                                event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Tipo
                                                <select
                                                    value={holidayDraft.scope}
                                                    onChange={(event) =>
                                                        setHolidayDraft((prev) => ({
                                                            ...prev,
                                                            scope: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value='national'>
                                                        Nacional
                                                    </option>
                                                    <option value='autonomous'>
                                                        Autonomico
                                                    </option>
                                                    <option value='local'>Local</option>
                                                </select>
                                            </label>
                                            <label>
                                                Nombre
                                                <input
                                                    type='text'
                                                    value={holidayDraft.name}
                                                    onChange={(event) =>
                                                        setHolidayDraft((prev) => ({
                                                            ...prev,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                    placeholder='Nombre del festivo'
                                                />
                                            </label>
                                            <button
                                                type='submit'
                                                className='service-schedule-btn'
                                                disabled={isSavingHoliday}
                                            >
                                                {isSavingHoliday
                                                    ? 'Anadiendo...'
                                                    : 'Anadir'}
                                            </button>
                                        </form>
                                        <div className='service-schedule-holidays__drag'>
                                            {Object.entries(holidayScopeLabels).map(
                                                ([scope, label]) => (
                                                    <button
                                                        key={scope}
                                                        type='button'
                                                        className='service-schedule-holidays__chip'
                                                        draggable
                                                        onDragStart={(event) => {
                                                            event.dataTransfer.setData(
                                                                'application/x-holiday-scope',
                                                                scope
                                                            );
                                                            event.dataTransfer.effectAllowed =
                                                                'copy';
                                                        }}
                                                    >
                                                        {label}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {serviceScheduleViewModal.scheduleView === 'image' &&
                            serviceScheduleViewModal.scheduleImage ? (
                                <div className='schedule-service-modal__image'>
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/uploads/${serviceScheduleViewModal.scheduleImage}`}
                                        alt={`Cuadrante de ${
                                            serviceScheduleViewModal.name ||
                                            serviceScheduleViewModal.type ||
                                            'servicio'
                                        }`}
                                    />
                                </div>
                            ) : (scheduleShiftMap[serviceScheduleViewModal.id] || [])
                                  .length ? (
                                <ServiceScheduleGrid
                                    month={serviceScheduleViewModal.month}
                                    shifts={
                                        scheduleShiftMap[
                                            serviceScheduleViewModal.id
                                        ] || []
                                    }
                                    employees={employees}
                                    absencesByEmployee={{}}
                                    holidaysByDate={buildServiceHolidaysByDate(
                                        serviceScheduleViewModal
                                    )}
                                    onHolidayDrop={handleHolidayDrop}
                                    onHolidayClick={handleHolidayClick}
                                    onShiftUpdate={handleScheduleViewShiftUpdate}
                                    onSelectShift={setSelectedGeneratedShift}
                                    readOnly={false}
                                    showUnassigned={(
                                        scheduleShiftMap[
                                            serviceScheduleViewModal.id
                                        ] || []
                                    ).some((shift) => !shift.employeeId)}
                                />
                            ) : (
                                <p className='schedule-empty'>
                                    Sin turnos para este mes.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedGeneratedShift && (
                <div className='service-schedule-modal-overlay'>
                    <div className='service-schedule-modal'>
                        <div className='service-schedule-modal-header'>
                            <div>
                                <h3>
                                    {generatedSchedulePreview
                                        ? 'Editar turno de la previsualizacion'
                                        : 'Editar turno'}
                                </h3>
                                <p>
                                    {generatedSchedulePreview
                                        ? 'Cambia trabajador, dia u horario antes de aplicar el cuadrante.'
                                        : 'Cambia trabajador, dia u horario del cuadrante guardado.'}
                                </p>
                            </div>
                            <button
                                type='button'
                                className='service-schedule-modal-close'
                                onClick={() => setSelectedGeneratedShift(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className='service-schedule-modal-grid'>
                            <label>
                                Fecha
                                <input
                                    type='date'
                                    value={String(
                                        selectedGeneratedShift.scheduleDate || ''
                                    ).slice(0, 10)}
                                    onChange={(event) =>
                                        handleGeneratedShiftFieldChange(
                                            'scheduleDate',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Inicio
                                <input
                                    type='time'
                                    value={selectedGeneratedShift.startTime || ''}
                                    onChange={(event) =>
                                        handleGeneratedShiftFieldChange(
                                            'startTime',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Fin
                                <input
                                    type='time'
                                    value={selectedGeneratedShift.endTime || ''}
                                    onChange={(event) =>
                                        handleGeneratedShiftFieldChange(
                                            'endTime',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Horas
                                <input
                                    type='number'
                                    step='0.25'
                                    min='0'
                                    value={selectedGeneratedShift.hours || ''}
                                    onChange={(event) =>
                                        handleGeneratedShiftFieldChange(
                                            'hours',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Trabajador
                                <select
                                    value={selectedGeneratedShift.employeeId || ''}
                                    onChange={(event) =>
                                        handleGeneratedShiftFieldChange(
                                            'employeeId',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value=''>Sin asignar</option>
                                    {employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                            {`${employee.firstName || ''} ${
                                                employee.lastName || ''
                                            }`.trim() || employee.email}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className='service-schedule-modal-actions'>
                            <button
                                type='button'
                                className='service-schedule-btn service-schedule-btn--ghost'
                                onClick={() => setSelectedGeneratedShift(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type='button'
                                className='service-schedule-btn'
                                onClick={handleSaveGeneratedShift}
                            >
                                Guardar cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {serviceScheduleModal && (
                <div className='schedule-service-modal'>
                    <button
                        type='button'
                        className='schedule-service-modal__backdrop'
                        onClick={() => setServiceScheduleModal(null)}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='schedule-service-modal__panel'>
                        <div className='schedule-service-modal__header'>
                            <div>
                                <h3>
                                    {serviceScheduleModal.name ||
                                        serviceScheduleModal.type ||
                                        'Cuadrante por servicio'}
                                </h3>
                                <p>
                                    {serviceScheduleModal.delegation} -{' '}
                                    {serviceScheduleModal.month}
                                </p>
                            </div>
                            <button
                                type='button'
                                className='schedule-service-modal__close'
                                onClick={() => setServiceScheduleModal(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='schedule-service-modal__body'>
                            <ServiceSchedulePanel
                                serviceId={serviceScheduleModal.id}
                                authToken={authToken}
                                scheduleImage={
                                    serviceScheduleModal.scheduleImage || ''
                                }
                                scheduleView={
                                    serviceScheduleModal.scheduleView || 'grid'
                                }
                            />
                        </div>
                    </div>
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
