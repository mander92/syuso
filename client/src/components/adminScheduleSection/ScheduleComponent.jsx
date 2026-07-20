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
    downloadEmployeeScheduleExcel,
    downloadEmployeeScheduleExcelZip,
    fetchHolidays,
    createHoliday,
    deleteHoliday,
    simulateServiceSchedule,
    applyServiceScheduleSimulation,
    createServiceScheduleShift,
    deleteServiceScheduleShift,
    updateServiceScheduleShift,
} from '../../services/serviceService.js';
import { fetchAdminShiftSwapRequests } from '../../services/shiftSwapService.js';
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

const scheduleEntryTypeLabels = {
    shift: 'Turno',
    off: 'Libre',
    vacation: 'Vacaciones',
    sick: 'Baja',
    available: 'Disponibilidad',
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

const isShiftOverlapError = (error) => error?.code === 'SHIFT_OVERLAP';

const formatOverlapDate = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return year && month && day ? `${day}-${month}-${year}` : value;
};

const unusedBuildShiftOverlapMessage = (error) => {
    const details = error?.details || {};
    const line = (label, shift) =>
        shift
            ? `${label}: ${shift.serviceName || 'Servicio'} · ${
                  shift.date || ''
              } · ${shift.startTime || ''}-${shift.endTime || ''}`
            : '';
    return [
        'Hay turnos pisados.',
        details.employeeName ? `Empleado: ${details.employeeName}` : '',
        line('Turno nuevo', details.newShift),
        line('Turno existente', details.existingShift),
        '',
        'Quieres permitir que se pisen?',
    ]
        .filter((item) => item !== '')
        .join('\n');
};

const unusedConfirmShiftOverlap = (error) =>
    isShiftOverlapError(error) &&
    window.confirm(unusedBuildShiftOverlapMessage(error));

const isPersistedShiftId = (id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(id || '')
    );

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
    const [scheduleRefreshVersion, setScheduleRefreshVersion] = useState(0);
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
    const [isDownloadingPersonalExcelZip, setIsDownloadingPersonalExcelZip] =
        useState(false);
    const [downloadingPersonalId, setDownloadingPersonalId] = useState('');
    const [downloadingPersonalExcelId, setDownloadingPersonalExcelId] =
        useState('');
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
    const [scheduleRequests, setScheduleRequests] = useState([]);
    const [copiedScheduleShift, setCopiedScheduleShift] = useState(null);
    const [shiftOverlapModal, setShiftOverlapModal] = useState(null);

    const confirmShiftOverlap = (error) => {
        if (!isShiftOverlapError(error)) return Promise.resolve(false);
        return new Promise((resolve) => {
            setShiftOverlapModal({
                details: error.details || {},
                message: error.message,
                resolve,
            });
        });
    };

    const closeShiftOverlapModal = (allowed) => {
        setShiftOverlapModal((current) => {
            current?.resolve?.(allowed);
            return null;
        });
    };

    useEffect(() => {
        const loadEmployees = async () => {
            if (!authToken || !isAdminLike) return;

            try {
                const params = new URLSearchParams({
                    role: 'employee',
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
        const loadScheduleRequests = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                const data = await fetchAdminShiftSwapRequests(authToken);
                setScheduleRequests(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar las peticiones de turnos'
                );
            }
        };

        loadScheduleRequests();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        const loadScheduleServices = async () => {
            if (!authToken || !isAdminLike) return;
            try {
                setScheduleLoading(true);
                const params = new URLSearchParams();
                if (scheduleServiceStatus && scheduleViewMode !== 'personal') {
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
                const allowedScheduleStatuses = ['confirmed', 'completed'];
                setScheduleServices(
                    normalized.filter(
                        (service) =>
                            typeof service?.id === 'string' &&
                            service.id.length === 36 &&
                            (scheduleServiceStatus ||
                                scheduleViewMode === 'personal' ||
                                allowedScheduleStatuses.includes(service.status))
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
        scheduleViewMode,
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
                        try {
                            if (!service?.id || service.id.length !== 36) {
                                return;
                            }
                            const shifts = await fetchServiceScheduleShifts(
                                authToken,
                                service.id,
                                scheduleMonth
                            );

                            const serviceDelegation =
                                service.province || service.city || '';
                            const filteredShifts = (shifts || [])
                                .filter((shift) => {
                                    if (
                                        scheduleEmployeeFilter &&
                                        shift.employeeId !==
                                            scheduleEmployeeFilter
                                    ) {
                                        return false;
                                    }
                                    if (scheduleStartDate || scheduleEndDate) {
                                        const shiftDate =
                                            typeof shift.scheduleDate ===
                                            'string'
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
                                })
                                .map((shift) => ({
                                    ...shift,
                                    serviceDelegation,
                                    serviceProvince: service.province || '',
                                    serviceCity: service.city || '',
                                }));

                            shiftMap[service.id] = filteredShifts;

                            const templates =
                                await fetchServiceScheduleTemplates(
                                    authToken,
                                    service.id,
                                    scheduleMonth
                                );
                            const templateApplied =
                                Array.isArray(templates) &&
                                templates.length > 0;

                            const employeeSet = new Set();
                            let totalHours = 0;
                            filteredShifts.forEach((shift) => {
                                if (shift.employeeId) {
                                    employeeSet.add(shift.employeeId);
                                }
                                totalHours += Number(shift.hours) || 0;
                            });

                            if (!scheduleServiceFilter && totalHours <= 0) {
                                delete shiftMap[service.id];
                                return;
                            }

                            cards.push({
                                id: service.id,
                                name: service.name,
                                type: service.type,
                                address: service.address,
                                delegation:
                                    service.province || 'Sin delegacion',
                                scheduleImage: service.scheduleImage || '',
                                scheduleView: service.scheduleView || 'grid',
                                assignedEmployeeIds:
                                    service.assignedEmployeeIds || '',
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
                        } catch (error) {
                            if (
                                error?.message
                                    ?.toLowerCase()
                                    .includes('acceso denegado')
                            ) {
                                return;
                            }
                            throw error;
                        }
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
        scheduleServiceStatus,
        scheduleStartDate,
        scheduleEndDate,
        scheduleViewMode,
        scheduleRefreshVersion,
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
            const applySimulation = (allowOverlap = false) =>
                applyServiceScheduleSimulation(
                    authToken,
                    serviceScheduleViewModal.id,
                    serviceScheduleViewModal.month,
                    generatedSchedulePreview,
                    { allowOverlap }
                );
            try {
                await applySimulation(false);
            } catch (error) {
                if (!(await confirmShiftOverlap(error))) throw error;
                await applySimulation(true);
            }
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
            const payload = {
                scheduleDate:
                    optimisticShift.scheduleDate || currentShift.scheduleDate,
                startTime: optimisticShift.startTime || currentShift.startTime,
                endTime: optimisticShift.endTime || currentShift.endTime,
                hours:
                    optimisticShift.hours !== undefined
                        ? optimisticShift.hours
                        : currentShift.hours,
                employeeId: optimisticShift.employeeId || null,
                shiftTypeId: optimisticShift.shiftTypeId || null,
            };
            const updateShift = (allowOverlap = false) =>
                updateServiceScheduleShift(authToken, serviceId, shiftId, {
                    ...payload,
                    allowOverlap,
                });
            let data;
            try {
                data = await updateShift(false);
            } catch (error) {
                if (!(await confirmShiftOverlap(error))) throw error;
                data = await updateShift(true);
            }
            updateSavedScheduleShiftInMap(serviceId, shiftId, data);
            toast.success('Turno actualizado');
        } catch (error) {
            updateSavedScheduleShiftInMap(serviceId, shiftId, currentShift);
            toast.error(error.message || 'No se pudo actualizar el turno');
        }
    };

    const handleScheduleViewShiftDelete = async (shift) => {
        if (!shift?.id || !serviceScheduleViewModal?.id) return;
        if (!window.confirm('Borrar este turno del cuadrante?')) return;
        const serviceId = serviceScheduleViewModal.id;

        if (generatedSchedulePreview || !isPersistedShiftId(shift.id)) {
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceId]: (prev[serviceId] || []).filter(
                    (item) => item.id !== shift.id
                ),
            }));
            setSelectedGeneratedShift(null);
            return;
        }

        try {
            await deleteServiceScheduleShift(authToken, serviceId, shift.id);
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceId]: (prev[serviceId] || []).filter(
                    (item) => item.id !== shift.id
                ),
            }));
            setSelectedGeneratedShift(null);
            toast.success('Turno eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el turno');
        }
    };

    const openNewScheduleViewShift = ({ employeeId, scheduleDate }) => {
        setSelectedGeneratedShift({
            entryType: copiedScheduleShift?.kind === 'absence'
                ? copiedScheduleShift.type
                : 'shift',
            scheduleDate,
            employeeId: employeeId || '',
            startTime: copiedScheduleShift?.startTime || '18:00',
            endTime: copiedScheduleShift?.endTime || '08:00',
            hours:
                copiedScheduleShift?.hours ||
                calculateShiftHours(
                    copiedScheduleShift?.startTime || '18:00',
                    copiedScheduleShift?.endTime || '08:00'
                ),
            shiftTypeId: copiedScheduleShift?.shiftTypeId || '',
            shiftTypeName: copiedScheduleShift?.shiftTypeName || '',
            shiftTypeColor: copiedScheduleShift?.shiftTypeColor || '',
            notes: copiedScheduleShift?.notes || '',
        });
    };

    const handleCopyScheduleViewShift = (shift) => {
        setCopiedScheduleShift({
            kind: 'shift',
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            shiftTypeId: shift.shiftTypeId || '',
            shiftTypeName: shift.shiftTypeName || '',
            shiftTypeColor: shift.shiftTypeColor || '',
        });
        toast.success('Turno copiado');
    };

    const handleCopyScheduleViewAbsence = (absence) => {
        setCopiedScheduleShift({
            kind: 'absence',
            type: absence.type || 'off',
            notes: absence.notes || '',
        });
        toast.success('Ausencia copiada');
    };

    const handlePasteScheduleViewShift = async (targetOrTargets) => {
        if (!copiedScheduleShift) return;
        if (!serviceScheduleViewModal?.id) return;

        const targets = Array.isArray(targetOrTargets)
            ? targetOrTargets
            : [targetOrTargets];
        const normalizedTargets = targets
            .filter(Boolean)
            .map((target) => ({
                employeeId: target.employeeId || '',
                scheduleDate: target.scheduleDate,
            }))
            .filter((target) => target.scheduleDate);
        if (!normalizedTargets.length) return;

        if (copiedScheduleShift.kind === 'absence') {
            const validTargets = normalizedTargets.filter(
                (target) => target.employeeId
            );
            if (!validTargets.length) {
                toast.error('Selecciona una celda de empleado para pegar.');
                return;
            }
            try {
                const created = await Promise.all(
                    validTargets.map((target) =>
                        createEmployeeAbsence(authToken, target.employeeId, {
                            startDate: target.scheduleDate,
                            endDate: target.scheduleDate,
                            type: copiedScheduleShift.type || 'off',
                            notes: copiedScheduleShift.notes || '',
                        })
                    )
                );
                setEmployeeAbsencesMap((prev) => {
                    const next = { ...prev };
                    created.forEach((absence) => {
                        if (!absence?.employeeId) return;
                        next[absence.employeeId] = [
                            absence,
                            ...(next[absence.employeeId] || []),
                        ];
                    });
                    return next;
                });
                toast.success(
                    created.length === 1
                        ? 'Ausencia pegada'
                        : `${created.length} ausencias pegadas`
                );
            } catch (error) {
                toast.error(error.message || 'No se pudo pegar la ausencia');
            }
            return;
        }

        const serviceId = serviceScheduleViewModal.id;
        const buildPayload = (target) => ({
            scheduleDate: target.scheduleDate,
            startTime: copiedScheduleShift.startTime,
            endTime: copiedScheduleShift.endTime,
            hours:
                copiedScheduleShift.hours ||
                calculateShiftHours(
                    copiedScheduleShift.startTime,
                    copiedScheduleShift.endTime
                ),
            employeeId: target.employeeId || null,
            shiftTypeId: copiedScheduleShift.shiftTypeId || null,
        });

        if (generatedSchedulePreview) {
            const pastedShifts = normalizedTargets.map((target) => ({
                ...buildPayload(target),
                id: `preview-${Date.now()}-${Math.random()}`,
                shiftTypeName: copiedScheduleShift.shiftTypeName || '',
                shiftTypeColor: copiedScheduleShift.shiftTypeColor || '',
            }));
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceId]: [...pastedShifts, ...(prev[serviceId] || [])],
            }));
            toast.success(
                pastedShifts.length === 1
                    ? 'Turno pegado'
                    : `${pastedShifts.length} turnos pegados`
            );
            return;
        }

        try {
            const createTargets = (allowOverlap = false) =>
                Promise.all(
                    normalizedTargets.map((target) =>
                        createServiceScheduleShift(authToken, serviceId, {
                            ...buildPayload(target),
                            allowOverlap,
                        })
                    )
                );
            let created;
            try {
                created = await createTargets(false);
            } catch (error) {
                if (!(await confirmShiftOverlap(error))) throw error;
                created = await createTargets(true);
            }
            setScheduleShiftMap((prev) => ({
                ...prev,
                [serviceId]: [...created, ...(prev[serviceId] || [])],
            }));
            toast.success(
                created.length === 1
                    ? 'Turno pegado'
                    : `${created.length} turnos pegados`
            );
        } catch (error) {
            toast.error(error.message || 'No se pudieron pegar los turnos');
        }
    };

    const handleDeleteScheduleViewAbsence = async (absence) => {
        if (!absence?.id || !absence?.employeeId) return;
        try {
            await deleteEmployeeAbsence(authToken, absence.employeeId, absence.id);
            setEmployeeAbsencesMap((prev) => ({
                ...prev,
                [absence.employeeId]: (prev[absence.employeeId] || []).filter(
                    (item) => item.id !== absence.id
                ),
            }));
            toast.success('Ausencia eliminada');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar la ausencia');
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
        if (!selectedGeneratedShift) return;
        if (selectedGeneratedShift.entryType !== 'shift') {
            if (!selectedGeneratedShift.employeeId) {
                toast.error('Selecciona un empleado para crear la ausencia');
                return;
            }
            try {
                const absence = await createEmployeeAbsence(
                    authToken,
                    selectedGeneratedShift.employeeId,
                    {
                        startDate: selectedGeneratedShift.scheduleDate,
                        endDate: selectedGeneratedShift.scheduleDate,
                        type: selectedGeneratedShift.entryType || 'off',
                        notes: selectedGeneratedShift.notes || '',
                    }
                );
                setEmployeeAbsencesMap((prev) => ({
                    ...prev,
                    [absence.employeeId]: [
                        absence,
                        ...(prev[absence.employeeId] || []),
                    ],
                }));
                toast.success('Marca creada');
                setSelectedGeneratedShift(null);
            } catch (error) {
                toast.error(error.message || 'No se pudo crear la marca');
            }
            return;
        }
        if (!selectedGeneratedShift.id) {
            if (!serviceScheduleViewModal?.id) return;
            const serviceId = serviceScheduleViewModal.id;
            const payload = {
                scheduleDate: selectedGeneratedShift.scheduleDate,
                startTime: selectedGeneratedShift.startTime,
                endTime: selectedGeneratedShift.endTime,
                hours: selectedGeneratedShift.hours,
                employeeId: selectedGeneratedShift.employeeId || null,
                shiftTypeId: selectedGeneratedShift.shiftTypeId || null,
            };

            if (generatedSchedulePreview) {
                const tempShift = {
                    ...payload,
                    id: `preview-${Date.now()}-${Math.random()}`,
                };
                setScheduleShiftMap((prev) => ({
                    ...prev,
                    [serviceId]: [tempShift, ...(prev[serviceId] || [])],
                }));
                setSelectedGeneratedShift(null);
                return;
            }

            try {
                const createShift = (allowOverlap = false) =>
                    createServiceScheduleShift(authToken, serviceId, {
                        ...payload,
                        allowOverlap,
                    });
                let data;
                try {
                    data = await createShift(false);
                } catch (error) {
                    if (!(await confirmShiftOverlap(error))) throw error;
                    data = await createShift(true);
                }
                setScheduleShiftMap((prev) => ({
                    ...prev,
                    [serviceId]: [data, ...(prev[serviceId] || [])],
                }));
                toast.success('Turno creado');
                setSelectedGeneratedShift(null);
            } catch (error) {
                toast.error(error.message || 'No se pudo crear el turno');
            }
            return;
        }
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

    const requestStatusLabel = (status) => {
        const labels = {
            pending_counterpart: 'Pendiente del companero',
            pending_admin: 'Pendiente de aprobacion',
            approved: 'Aprobada',
            rejected: 'Rechazada',
        };
        return labels[status] || status || 'Solicitud';
    };

    const requestTypeLabel = (type) => {
        const labels = {
            swap: 'Cambio',
            give: 'Cesion',
            take: 'Peticion',
            transfer: 'Cesion',
            request: 'Peticion',
        };
        return labels[type] || type || 'Cambio';
    };

    const requestTypeShortLabel = (type) => {
        const labels = {
            swap: 'C',
            give: 'X',
            take: 'P',
            transfer: 'X',
            request: 'P',
        };
        return labels[type] || 'C';
    };

    const parseShiftIdList = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    };

    const toScheduleDateKey = (value) => {
        if (!value) return '';
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }
        const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : String(value).slice(0, 10);
    };

    const buildRequestBadgesByCell = (requests, shifts) => {
        const shiftById = new Map(
            (shifts || [])
                .filter((shift) => shift?.id)
                .map((shift) => [shift.id, shift])
        );
        const badges = {};

        requests.forEach((request) => {
            const shiftIds = [
                request.fromShiftId,
                request.toShiftId,
                ...parseShiftIdList(request.fromShiftIds),
                ...parseShiftIdList(request.toShiftIds),
            ].filter(Boolean);

            [...new Set(shiftIds)].forEach((shiftId) => {
                const shift = shiftById.get(shiftId);
                if (!shift?.employeeId || !shift?.scheduleDate) return;
                const dateKey = toScheduleDateKey(shift.scheduleDate);
                if (!dateKey) return;
                const cellKey = `${shift.employeeId}_${dateKey}`;
                if (!badges[cellKey]) badges[cellKey] = [];
                badges[cellKey].push({
                    id: `${request.id}-${shiftId}`,
                    status: request.status,
                    label: requestTypeShortLabel(request.requestType),
                    title: [
                        `${requestTypeLabel(request.requestType)} - ${requestStatusLabel(request.status)}`,
                        `${request.requestorName || 'Solicitante'} con ${request.counterpartName || 'companero'}`,
                        [request.fromShiftSummary, request.toShiftSummary]
                            .filter(Boolean)
                            .join(' -> '),
                    ]
                        .filter(Boolean)
                        .join(' · '),
                });
            });
        });

        return badges;
    };

    const requestMatchesMonth = (request, month) => {
        if (!month) return true;
        const [year, monthNumber] = month.split('-');
        const token = `${monthNumber}/${year}`;
        const summaries = [
            request.fromShiftSummary,
            request.toShiftSummary,
        ].filter(Boolean);
        return summaries.length
            ? summaries.some((summary) => String(summary).includes(token))
            : String(request.createdAt || '').startsWith(month);
    };

    const getScheduleRequestsForService = (serviceId, month) =>
        scheduleRequests.filter(
            (request) =>
                request.serviceId === serviceId &&
                ['pending_admin', 'approved'].includes(request.status) &&
                requestMatchesMonth(request, month)
        );

    const getRequestBadgesForService = (serviceId, month) => {
        const shifts = scheduleShiftMap[serviceId] || [];
        return buildRequestBadgesByCell(
            getScheduleRequestsForService(serviceId, month),
            shifts
        );
    };

    const getScheduleRequestsForEmployee = (employeeId, month) =>
        scheduleRequests.filter(
            (request) =>
                (request.requestorId === employeeId ||
                    request.counterpartId === employeeId) &&
                ['pending_admin', 'approved'].includes(request.status) &&
                requestMatchesMonth(request, month)
        );

    const renderScheduleRequests = (requests) => {
        if (!requests.length) return null;

        return (
            <div className='schedule-requests-summary'>
                <strong>Peticiones aprobadas o en aprobacion</strong>
                <div className='schedule-requests-summary__list'>
                    {requests.map((request) => (
                        <div
                            className='schedule-requests-summary__item'
                            key={request.id}
                        >
                            <span>
                                {requestTypeLabel(request.requestType)} -{' '}
                                {requestStatusLabel(request.status)}
                            </span>
                            <small>
                                {request.requestorName || 'Solicitante'} con{' '}
                                {request.counterpartName || 'companero'}
                            </small>
                            <small>
                                {[request.fromShiftSummary, request.toShiftSummary]
                                    .filter(Boolean)
                                    .join(' -> ') || 'Sin detalle de turnos'}
                            </small>
                        </div>
                    ))}
                </div>
            </div>
        );
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

    useEffect(() => {
        const loadServiceScheduleAbsences = async () => {
            if (!authToken || !isAdminLike || !serviceScheduleViewModal?.id) return;

            const assignedIds = new Set(
                String(serviceScheduleViewModal.assignedEmployeeIds || '')
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean)
            );
            const shiftEmployeeIds = new Set(
                (scheduleShiftMap[serviceScheduleViewModal.id] || [])
                    .map((shift) => shift.employeeId)
                    .filter(Boolean)
            );
            const employeeIds = employees
                .filter(
                    (employee) =>
                        assignedIds.has(employee.id) ||
                        shiftEmployeeIds.has(employee.id)
                )
                .map((employee) => employee.id);
            const missingEmployeeIds = employeeIds.filter(
                (employeeId) => !employeeAbsencesMap[employeeId]
            );
            if (!missingEmployeeIds.length) return;

            try {
                const entries = await Promise.all(
                    missingEmployeeIds.map(async (employeeId) => {
                        try {
                            const absences = await fetchEmployeeAbsences(
                                authToken,
                                employeeId
                            );
                            return [
                                employeeId,
                                Array.isArray(absences) ? absences : [],
                            ];
                        } catch {
                            return [employeeId, []];
                        }
                    })
                );
                setEmployeeAbsencesMap((prev) => ({
                    ...prev,
                    ...Object.fromEntries(entries),
                }));
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar ausencias');
            }
        };

        loadServiceScheduleAbsences();
    }, [
        authToken,
        isAdminLike,
        serviceScheduleViewModal?.id,
        serviceScheduleViewModal?.assignedEmployeeIds,
        scheduleShiftMap,
        employees,
        employeeAbsencesMap,
    ]);


    const serviceScheduleModalEmployees = useMemo(() => {
        if (!serviceScheduleViewModal) return [];

        const assignedIds = new Set(
            String(serviceScheduleViewModal.assignedEmployeeIds || '')
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean)
        );
        const shiftEmployeeIds = new Set(
            (scheduleShiftMap[serviceScheduleViewModal.id] || [])
                .map((shift) => shift.employeeId)
                .filter(Boolean)
        );

        const employeeMap = new Map();
        employees
            .filter(
                (employee) =>
                    assignedIds.has(employee.id) ||
                    shiftEmployeeIds.has(employee.id)
            )
            .forEach((employee) => {
                employeeMap.set(employee.id, employee);
            });

        (scheduleShiftMap[serviceScheduleViewModal.id] || []).forEach((shift) => {
            if (!shift?.employeeId || employeeMap.has(shift.employeeId)) return;
            employeeMap.set(shift.employeeId, {
                id: shift.employeeId,
                firstName: shift.firstName || 'Empleado',
                lastName: shift.lastName || 'inactivo',
                inactiveFromShift: true,
            });
        });

        return [...employeeMap.values()];
    }, [employees, scheduleShiftMap, serviceScheduleViewModal]);

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

        const employeesForRows = [...filteredEmployees];
        employeeMap.forEach((shifts, employeeId) => {
            if (employeesForRows.some((employee) => employee.id === employeeId)) {
                return;
            }
            const firstShift = shifts[0] || {};
            employeesForRows.push({
                id: employeeId,
                firstName: firstShift.firstName || 'Empleado',
                lastName: firstShift.lastName || 'inactivo',
                delegations:
                    firstShift.serviceDelegation ||
                    firstShift.serviceProvince ||
                    firstShift.serviceCity ||
                    'Sin delegacion',
                inactiveFromShift: true,
            });
        });

        return employeesForRows
            .map((employee) => {
                const shifts = employeeMap.get(employee.id) || [];
                const totalHours = shifts.reduce(
                    (acc, shift) => acc + (Number(shift.hours) || 0),
                    0
                );
                const totalNightHours = shifts.reduce(
                    (acc, shift) => acc + (Number(shift.nightHours) || 0),
                    0
                );
                const totalHolidayHours = shifts.reduce(
                    (acc, shift) => acc + (Number(shift.holidayHours) || 0),
                    0
                );
                return {
                    id: employee.id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    delegation:
                        employee.delegations || employee.city || 'Sin delegacion',
                    shifts,
                    totalHours,
                    totalNightHours,
                    totalHolidayHours,
                };
            })
            .filter((row) => scheduleEmployeeFilter || row.totalHours > 0);
    }, [scheduleShiftMap, filteredEmployees, scheduleEmployeeFilter]);

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

    const handlePersonalExcelZipDownload = async () => {
        if (!authToken) return;
        const employeeIds = personalScheduleRows.map((row) => row.id).filter(Boolean);
        if (!employeeIds.length) {
            toast.error('No hay cuadrantes personales para descargar');
            return;
        }
        try {
            setIsDownloadingPersonalExcelZip(true);
            const data = await downloadEmployeeScheduleExcelZip(
                authToken,
                scheduleMonth,
                employeeIds
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el ZIP Excel');
        } finally {
            setIsDownloadingPersonalExcelZip(false);
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

    const handlePersonalExcelDownload = async (employeeId) => {
        if (!authToken || !employeeId) return;
        try {
            setDownloadingPersonalExcelId(employeeId);
            const data = await downloadEmployeeScheduleExcel(
                authToken,
                scheduleMonth,
                employeeId
            );
            triggerDownload(data);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar el Excel');
        } finally {
            setDownloadingPersonalExcelId('');
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
            <div className='schedule-layout'>
                <aside className='schedule-sidebar-filters'>
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

                </aside>

                <div className='schedule-content'>
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
                            <>
                                <button
                                    type='button'
                                    className='schedule-btn schedule-btn--ghost'
                                    onClick={handlePersonalZipDownload}
                                    disabled={
                                        !personalScheduleRows.length ||
                                        isDownloadingPersonalZip
                                    }
                                >
                                    {isDownloadingPersonalZip
                                        ? 'Generando...'
                                        : 'ZIP PDF personales'}
                                </button>
                                <button
                                    type='button'
                                    className='schedule-btn'
                                    onClick={handlePersonalExcelZipDownload}
                                    disabled={
                                        !personalScheduleRows.length ||
                                        isDownloadingPersonalExcelZip
                                    }
                                >
                                    {isDownloadingPersonalExcelZip
                                        ? 'Generando...'
                                        : 'ZIP Excel personales'}
                                </button>
                            </>
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
                                            className='schedule-btn schedule-btn--ghost'
                                            onClick={() =>
                                                handlePersonalExcelDownload(item.id)
                                            }
                                            disabled={
                                                downloadingPersonalExcelId === item.id
                                            }
                                        >
                                            {downloadingPersonalExcelId === item.id
                                                ? 'Generando...'
                                                : 'Excel'}
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
                </div>
            </div>

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
                            {renderScheduleRequests(
                                getScheduleRequestsForService(
                                    serviceScheduleViewModal.id,
                                    serviceScheduleViewModal.month
                                )
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
                                    employees={serviceScheduleModalEmployees}
                                    absencesByEmployee={employeeAbsencesMap}
                                    holidaysByDate={buildServiceHolidaysByDate(
                                        serviceScheduleViewModal
                                    )}
                                    onHolidayDrop={handleHolidayDrop}
                                    onHolidayClick={handleHolidayClick}
                                    onShiftUpdate={handleScheduleViewShiftUpdate}
                                    onSelectShift={(shift) =>
                                        setSelectedGeneratedShift({
                                            ...shift,
                                            entryType: 'shift',
                                        })
                                    }
                                    onCreateShift={openNewScheduleViewShift}
                                    onCopyShift={handleCopyScheduleViewShift}
                                    onPasteShift={handlePasteScheduleViewShift}
                                    onDeleteShift={handleScheduleViewShiftDelete}
                                    onCopyAbsence={handleCopyScheduleViewAbsence}
                                    onPasteAbsence={handlePasteScheduleViewShift}
                                    onDeleteAbsence={handleDeleteScheduleViewAbsence}
                                    copiedShift={
                                        copiedScheduleShift?.kind === 'shift'
                                            ? copiedScheduleShift
                                            : null
                                    }
                                    copiedAbsence={
                                        copiedScheduleShift?.kind === 'absence'
                                            ? copiedScheduleShift
                                            : null
                                    }
                                    requestBadgesByCell={getRequestBadgesForService(
                                        serviceScheduleViewModal.id,
                                        serviceScheduleViewModal.month
                                    )}
                                    readOnly={false}
                                    showUnassigned={(
                                        scheduleShiftMap[
                                            serviceScheduleViewModal.id
                                        ] || []
                                    ).some((shift) => !shift.employeeId)}
                                    showAllEmployees={false}
                                    showAgreementHours={
                                        serviceScheduleViewModal.hourRuleType ===
                                        'convenio'
                                    }
                                />
                            ) : (
                                <ServiceScheduleGrid
                                    month={serviceScheduleViewModal.month}
                                    shifts={[]}
                                    employees={serviceScheduleModalEmployees}
                                    absencesByEmployee={employeeAbsencesMap}
                                    holidaysByDate={buildServiceHolidaysByDate(
                                        serviceScheduleViewModal
                                    )}
                                    onHolidayDrop={handleHolidayDrop}
                                    onHolidayClick={handleHolidayClick}
                                    onCreateShift={openNewScheduleViewShift}
                                    onPasteShift={handlePasteScheduleViewShift}
                                    onPasteAbsence={handlePasteScheduleViewShift}
                                    copiedShift={
                                        copiedScheduleShift?.kind === 'shift'
                                            ? copiedScheduleShift
                                            : null
                                    }
                                    copiedAbsence={
                                        copiedScheduleShift?.kind === 'absence'
                                            ? copiedScheduleShift
                                            : null
                                    }
                                    requestBadgesByCell={getRequestBadgesForService(
                                        serviceScheduleViewModal.id,
                                        serviceScheduleViewModal.month
                                    )}
                                    readOnly={false}
                                    showUnassigned={false}
                                    showAllEmployees
                                    showAgreementHours={
                                        serviceScheduleViewModal.hourRuleType ===
                                        'convenio'
                                    }
                                />
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
                                    {!selectedGeneratedShift.id
                                        ? 'Nuevo turno'
                                        : generatedSchedulePreview
                                        ? 'Editar turno de la previsualizacion'
                                        : 'Editar turno'}
                                </h3>
                                <p>
                                    {!selectedGeneratedShift.id
                                        ? 'Anade el turno directamente al cuadrante.'
                                        : generatedSchedulePreview
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
                            {!selectedGeneratedShift.id && (
                                <label>
                                    Que quieres crear
                                    <select
                                        value={
                                            selectedGeneratedShift.entryType ||
                                            'shift'
                                        }
                                        onChange={(event) =>
                                            handleGeneratedShiftFieldChange(
                                                'entryType',
                                                event.target.value
                                            )
                                        }
                                    >
                                        {Object.entries(
                                            scheduleEntryTypeLabels
                                        ).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
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
                            {(selectedGeneratedShift.entryType || 'shift') ===
                                'shift' && (
                                <>
                                    <label>
                                        Inicio
                                        <input
                                            type='time'
                                            value={
                                                selectedGeneratedShift.startTime ||
                                                ''
                                            }
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
                                            value={
                                                selectedGeneratedShift.endTime ||
                                                ''
                                            }
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
                                            value={
                                                selectedGeneratedShift.hours || ''
                                            }
                                            onChange={(event) =>
                                                handleGeneratedShiftFieldChange(
                                                    'hours',
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </label>
                                </>
                            )}
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
                            {(selectedGeneratedShift.entryType || 'shift') !==
                                'shift' && (
                                <label>
                                    Nota
                                    <input
                                        type='text'
                                        value={selectedGeneratedShift.notes || ''}
                                        onChange={(event) =>
                                            handleGeneratedShiftFieldChange(
                                                'notes',
                                                event.target.value
                                            )
                                        }
                                        placeholder='Opcional'
                                    />
                                </label>
                            )}
                        </div>
                        <div className='service-schedule-modal-actions'>
                            <button
                                type='button'
                                className='service-schedule-btn service-schedule-btn--ghost'
                                onClick={() => setSelectedGeneratedShift(null)}
                            >
                                Cancelar
                            </button>
                            {selectedGeneratedShift.id && (
                                <button
                                    type='button'
                                    className='service-schedule-btn service-schedule-btn--danger'
                                    onClick={() =>
                                        handleScheduleViewShiftDelete(
                                            selectedGeneratedShift
                                        )
                                    }
                                >
                                    Borrar turno
                                </button>
                            )}
                            <button
                                type='button'
                                className='service-schedule-btn'
                                onClick={handleSaveGeneratedShift}
                            >
                                {selectedGeneratedShift.id
                                    ? 'Guardar cambio'
                                    : (selectedGeneratedShift.entryType || 'shift') ===
                                        'shift'
                                      ? 'Crear turno'
                                      : 'Crear marca'}
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
                                initialMonth={scheduleMonth}
                                scheduleImage={
                                    serviceScheduleModal.scheduleImage || ''
                                }
                                scheduleView={
                                    serviceScheduleModal.scheduleView || 'grid'
                                }
                                onServiceUpdate={() =>
                                    setScheduleRefreshVersion((value) => value + 1)
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
                            {renderScheduleRequests(
                                getScheduleRequestsForEmployee(
                                    personalModal.id,
                                    scheduleMonth
                                )
                            )}
                            {(() => {
                                const absences =
                                    employeeAbsencesMap[personalModal.id] || [];
                                const absenceRowId = `absences-${personalModal.id}`;
                                const formatModalHours = (value) =>
                                    (Number(value) || 0).toFixed(2);
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
                                const serviceSummaries = serviceRows.map((row) => {
                                    const serviceShifts =
                                        personalModal.shifts.filter(
                                            (shift) =>
                                                shift.serviceId === row.id
                                        );
                                    return {
                                        id: row.id,
                                        name: row.firstName || 'Servicio',
                                        totalHours: serviceShifts.reduce(
                                            (acc, shift) =>
                                                acc +
                                                (Number(shift.hours) || 0),
                                            0
                                        ),
                                        nightHours: serviceShifts.reduce(
                                            (acc, shift) =>
                                                acc +
                                                (Number(shift.nightHours) || 0),
                                            0
                                        ),
                                        holidayHours: serviceShifts.reduce(
                                            (acc, shift) =>
                                                acc +
                                                (Number(shift.holidayHours) ||
                                                    0),
                                            0
                                        ),
                                    };
                                });
                                const modalTotals = serviceSummaries.reduce(
                                    (acc, item) => ({
                                        totalHours:
                                            acc.totalHours + item.totalHours,
                                        nightHours:
                                            acc.nightHours + item.nightHours,
                                        holidayHours:
                                            acc.holidayHours +
                                            item.holidayHours,
                                    }),
                                    {
                                        totalHours: 0,
                                        nightHours: 0,
                                        holidayHours: 0,
                                    }
                                );
                                return (
                                    <>
                                        <div className='schedule-personal-modal-summary'>
                                            <div className='schedule-personal-modal-summary__header'>
                                                <strong>
                                                    {personalModal.name}
                                                </strong>
                                                <span>
                                                    Total:{' '}
                                                    {formatModalHours(
                                                        modalTotals.totalHours
                                                    )}{' '}
                                                    h
                                                    {modalTotals.nightHours ||
                                                    modalTotals.holidayHours
                                                        ? ` | N ${formatModalHours(
                                                              modalTotals.nightHours
                                                          )} h | F ${formatModalHours(
                                                              modalTotals.holidayHours
                                                          )} h`
                                                        : ''}
                                                </span>
                                            </div>
                                            <div className='schedule-personal-modal-summary__grid'>
                                                {serviceSummaries.map(
                                                    (item) => (
                                                        <div
                                                            key={item.id}
                                                            className='schedule-personal-modal-summary__item'
                                                        >
                                                            <strong>
                                                                {item.name}
                                                            </strong>
                                                            <span>
                                                                Total:{' '}
                                                                {formatModalHours(
                                                                    item.totalHours
                                                                )}{' '}
                                                                h
                                                            </span>
                                                            {(item.nightHours >
                                                                0 ||
                                                                item.holidayHours >
                                                                    0) && (
                                                                <small>
                                                                    N{' '}
                                                                    {formatModalHours(
                                                                        item.nightHours
                                                                    )}{' '}
                                                                    h | F{' '}
                                                                    {formatModalHours(
                                                                        item.holidayHours
                                                                    )}{' '}
                                                                    h
                                                                </small>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
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
                                            showAgreementHours={
                                                modalTotals.nightHours > 0 ||
                                                modalTotals.holidayHours > 0
                                            }
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {shiftOverlapModal && (
                <div className='shift-overlap-modal'>
                    <button
                        type='button'
                        className='shift-overlap-modal__backdrop'
                        onClick={() => closeShiftOverlapModal(false)}
                        aria-label='Cerrar aviso de turnos pisados'
                    />
                    <div className='shift-overlap-modal__panel'>
                        <h3>Turnos pisados</h3>
                        <p>
                            Hay un turno que coincide con otro ya asignado.
                        </p>
                        <div className='shift-overlap-modal__details'>
                            <strong>
                                {shiftOverlapModal.details.employeeName ||
                                    'Empleado'}
                            </strong>
                            <span>
                                Nuevo:{' '}
                                {shiftOverlapModal.details.newShift
                                    ?.serviceName || 'Servicio'}{' '}
                                ·{' '}
                                {formatOverlapDate(
                                    shiftOverlapModal.details.newShift?.date
                                )}{' '}
                                ·{' '}
                                {
                                    shiftOverlapModal.details.newShift
                                        ?.startTime
                                }
                                -
                                {shiftOverlapModal.details.newShift?.endTime}
                            </span>
                            <span>
                                Existente:{' '}
                                {shiftOverlapModal.details.existingShift
                                    ?.serviceName || 'Servicio'}{' '}
                                ·{' '}
                                {formatOverlapDate(
                                    shiftOverlapModal.details.existingShift
                                        ?.date
                                )}{' '}
                                ·{' '}
                                {
                                    shiftOverlapModal.details.existingShift
                                        ?.startTime
                                }
                                -
                                {
                                    shiftOverlapModal.details.existingShift
                                        ?.endTime
                                }
                            </span>
                        </div>
                        <p>Quieres permitir que se pisen?</p>
                        <div className='shift-overlap-modal__actions'>
                            <button
                                type='button'
                                className='schedule-btn schedule-btn--ghost'
                                onClick={() => closeShiftOverlapModal(false)}
                            >
                                No, cancelar
                            </button>
                            <button
                                type='button'
                                className='schedule-btn'
                                onClick={() => closeShiftOverlapModal(true)}
                            >
                                Si, permitir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ScheduleComponent;
