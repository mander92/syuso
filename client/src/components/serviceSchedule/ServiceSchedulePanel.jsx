import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import {
    applyServiceScheduleTemplate,
    createServiceScheduleShift,
    deleteServiceScheduleShift,
    fetchServiceShiftTypes,
    fetchServiceScheduleShifts,
    fetchServiceScheduleTemplates,
    fetchEditServiceServices,
    fetchDetailServiceServices,
    saveServiceScheduleTemplates,
    createServiceShiftType,
    updateServiceShiftType,
    deleteServiceShiftType,
    updateServiceScheduleShift,
    uploadServiceScheduleImage,
    simulateServiceSchedule,
    applyServiceScheduleSimulation,
    importServiceScheduleExcel,
    fetchHolidays,
    createHoliday,
    deleteHoliday,
} from '../../services/serviceService.js';
import { fetchAllUsersServices, fetchEmployeeAbsences } from '../../services/userService.js';
import ServiceScheduleGrid from './ServiceScheduleGrid.jsx';
import './ServiceSchedulePanel.css';

const weekdayOptions = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miercoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sabado' },
    { value: 7, label: 'Domingo' },
];

const toLocalDateInput = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
};

const formatTime = (value) => {
    if (!value) return '';
    const [hours, minutes] = String(value).split(':');
    if (hours == null || minutes == null) return value;
    return `${hours}:${minutes}`;
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

const formatDateEs = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
};

const buildShiftOverlapMessage = (error) => {
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

const confirmShiftOverlap = (error) =>
    error?.code === 'SHIFT_OVERLAP' &&
    window.confirm(buildShiftOverlapMessage(error));

const isShiftOverlapError = (error) => error?.code === 'SHIFT_OVERLAP';

const isPersistedShiftId = (id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(id || '')
    );

const formatOverlapDate = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return year && month && day ? `${day}-${month}-${year}` : value;
};

const holidayScopeLabels = {
    national: 'Nacional',
    autonomous: 'Autonomico',
    local: 'Local',
};

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const ServiceSchedulePanel = ({
    serviceId,
    authToken,
    initialMonth = '',
    scheduleImage: initialScheduleImage = '',
    scheduleView: initialScheduleView = 'grid',
    onServiceUpdate,
}) => {
    const [month, setMonth] = useState(
        () => initialMonth || new Date().toISOString().slice(0, 7)
    );
    const [scheduleImage, setScheduleImage] = useState(initialScheduleImage || '');
    const [scheduleView, setScheduleView] = useState(
        initialScheduleView === 'image' ? 'image' : 'grid'
    );
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSavingScheduleView, setIsSavingScheduleView] = useState(false);
    const [templateRows, setTemplateRows] = useState([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const [applyStartDate, setApplyStartDate] = useState(toLocalDateInput());
    const [shifts, setShifts] = useState([]);
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [isSavingShiftType, setIsSavingShiftType] = useState(false);
    const [newShiftType, setNewShiftType] = useState({ name: '', color: '#38bdf8' });
    const [absencesByEmployee, setAbsencesByEmployee] = useState({});
    const [selectedShift, setSelectedShift] = useState(null);
    const [isSavingShift, setIsSavingShift] = useState(false);
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [isSimulationActive, setIsSimulationActive] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isApplyingSimulation, setIsApplyingSimulation] = useState(false);
    const [scheduleImportFile, setScheduleImportFile] = useState(null);
    const [scheduleImportPreview, setScheduleImportPreview] = useState(null);
    const [showImportGridPreview, setShowImportGridPreview] = useState(true);
    const [isPreviewingImport, setIsPreviewingImport] = useState(false);
    const [isApplyingImport, setIsApplyingImport] = useState(false);
    const [replaceImportedMonth, setReplaceImportedMonth] = useState(true);
    const [employeeImportMappings, setEmployeeImportMappings] = useState({});
    const [serviceInfo, setServiceInfo] = useState(null);
    const [holidays, setHolidays] = useState([]);
    const [holidayDraft, setHolidayDraft] = useState({
        holidayDate: toLocalDateInput(),
        scope: 'local',
        name: '',
    });
    const [isSavingHoliday, setIsSavingHoliday] = useState(false);
    const [isHolidayToolsOpen, setIsHolidayToolsOpen] = useState(false);
    const [shiftOverlapModal, setShiftOverlapModal] = useState(null);
    const [newShift, setNewShift] = useState({
        scheduleDate: toLocalDateInput(),
        startTime: '18:00',
        endTime: '08:00',
        hours: '',
        employeeId: '',
        shiftTypeId: '',
    });

    const requestShiftOverlapConfirmation = (error) => {
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
        setScheduleImage(initialScheduleImage || '');
    }, [initialScheduleImage]);

    useEffect(() => {
        if (initialMonth) setMonth(initialMonth);
    }, [initialMonth]);

    useEffect(() => {
        setScheduleView(initialScheduleView === 'image' ? 'image' : 'grid');
    }, [initialScheduleView]);

    const visibleEmployees = useMemo(() => {
        const map = new Map();
        assignedEmployees.forEach((employee) => {
            if (!employee?.id) return;
            map.set(employee.id, employee);
        });
        (shifts || []).forEach((shift) => {
            if (!shift?.employeeId) return;
            if (map.has(shift.employeeId)) return;
            const fallback = employees.find(
                (employee) => employee.id === shift.employeeId
            );
            if (fallback) {
                map.set(shift.employeeId, fallback);
            }
        });
        return [...map.values()];
    }, [assignedEmployees, shifts, employees]);

    const employeeOptions = useMemo(() => {
        return visibleEmployees.map((employee) => ({
            value: employee.id,
            label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        }));
    }, [visibleEmployees]);

    const importPreviewEmployees = useMemo(() => {
        const map = new Map();
        (scheduleImportPreview?.shifts || []).forEach((shift) => {
            if (!shift.employeeId || map.has(shift.employeeId)) return;
            const fallback = employees.find(
                (employee) => employee.id === shift.employeeId
            );
            map.set(shift.employeeId, {
                id: shift.employeeId,
                firstName:
                    fallback?.firstName ||
                    String(shift.employeeName || '').split(' ')[0] ||
                    '',
                lastName:
                    fallback?.lastName ||
                    String(shift.employeeName || '')
                        .split(' ')
                        .slice(1)
                        .join(' '),
            });
        });
        return [...map.values()];
    }, [employees, scheduleImportPreview]);

    const shiftTypeOptions = useMemo(() => {
        return shiftTypes.map((type) => ({
            value: type.id,
            label: type.name,
            color: type.color,
        }));
    }, [shiftTypes]);

    const serviceHolidays = useMemo(() => {
        const serviceCommunity = normalizeText(serviceInfo?.autonomousCommunity);
        const serviceProvince = normalizeText(serviceInfo?.province);
        const serviceCity = normalizeText(serviceInfo?.city);

        return holidays.filter((holiday) => {
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
        });
    }, [holidays, serviceInfo]);

    const holidaysByDate = useMemo(() => {
        const map = {};
        serviceHolidays.forEach((holiday) => {
            const key = String(holiday.holidayDate || '').slice(0, 10);
            if (!key) return;
            if (!map[key]) map[key] = [];
            map[key].push(holiday);
        });
        return map;
    }, [serviceHolidays]);

    const defaultShiftTypeId = shiftTypeOptions[0]?.value || '';

    const loadTemplates = useCallback(async () => {
        if (!authToken || !serviceId || !month) return;
        try {
            const data = await fetchServiceScheduleTemplates(
                authToken,
                serviceId,
                month
            );
            const rows = Array.isArray(data) ? data : [];
            setTemplateRows(
                rows.map((row) => ({
                    ...row,
                    shiftTypeId: row.shiftTypeId || defaultShiftTypeId || '',
                }))
            );
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar la plantilla');
        }
    }, [authToken, serviceId, month, defaultShiftTypeId]);

    const loadShifts = useCallback(async () => {
        if (!authToken || !serviceId || !month) return;
        try {
            setIsLoadingShifts(true);
            const data = await fetchServiceScheduleShifts(
                authToken,
                serviceId,
                month
            );
            setShifts(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar los turnos');
        } finally {
            setIsLoadingShifts(false);
        }
    }, [authToken, serviceId, month]);

    useEffect(() => {
        loadTemplates();
        loadShifts();
    }, [loadTemplates, loadShifts]);

    useEffect(() => {
        if (isSimulationActive) {
            setIsSimulationActive(false);
        }
    }, [month]);

    useEffect(() => {
        if (!authToken) return;
        const loadEmployees = async () => {
            try {
                const data = await fetchAllUsersServices(
                    'role=employee&active=1',
                    authToken
                );
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar empleados');
            }
        };
        loadEmployees();
    }, [authToken]);

    useEffect(() => {
        const loadAssignedEmployees = async () => {
            if (!authToken || !serviceId) {
                setAssignedEmployees([]);
                return;
            }
            try {
                const data = await fetchDetailServiceServices(
                    serviceId,
                    authToken
                );
                const rows = Array.isArray(data) ? data : data ? [data] : [];
                setServiceInfo(rows[0] || null);
                const map = new Map();
                rows.forEach((row) => {
                    if (!row?.employeeId) return;
                    if (!map.has(row.employeeId)) {
                        map.set(row.employeeId, {
                            id: row.employeeId,
                            firstName: row.firstName || '',
                            lastName: row.lastName || '',
                        });
                    }
                });
                setAssignedEmployees([...map.values()]);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar empleados asignados'
                );
            }
        };

        loadAssignedEmployees();
    }, [authToken, serviceId]);

    const loadHolidays = useCallback(async () => {
        if (!authToken || !month) return;
        try {
            const year = month.slice(0, 4);
            const data = await fetchHolidays(authToken, { year });
            setHolidays(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar los festivos');
        }
    }, [authToken, month]);

    useEffect(() => {
        loadHolidays();
    }, [loadHolidays]);

    useEffect(() => {
        const loadShiftTypes = async () => {
            if (!authToken || !serviceId) return;
            try {
                const data = await fetchServiceShiftTypes(authToken, serviceId);
                setShiftTypes(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar los tipos de turno');
            }
        };
        loadShiftTypes();
    }, [authToken, serviceId]);

    useEffect(() => {
        if (!visibleEmployees.length || !authToken) {
            setAbsencesByEmployee({});
            return;
        }

        const loadAbsences = async () => {
            try {
                const results = await Promise.all(
                    visibleEmployees.map(async (employee) => {
                        const data = await fetchEmployeeAbsences(authToken, employee.id);
                        return [employee.id, Array.isArray(data) ? data : []];
                    })
                );
                setAbsencesByEmployee(Object.fromEntries(results));
            } catch (error) {
                toast.error(error.message || 'No se pudieron cargar ausencias');
            }
        };

        loadAbsences();
    }, [authToken, visibleEmployees, month]);

    useEffect(() => {
        if (!defaultShiftTypeId) return;
        setNewShift((prev) =>
            prev.shiftTypeId ? prev : { ...prev, shiftTypeId: defaultShiftTypeId }
        );
    }, [defaultShiftTypeId]);

    useEffect(() => {
        const hours = calculateShiftHours(newShift.startTime, newShift.endTime);
        setNewShift((prev) =>
            String(prev.hours) === String(hours) ? prev : { ...prev, hours }
        );
    }, [newShift.startTime, newShift.endTime]);

    const handleTemplateChange = (index, field, value) => {
        setTemplateRows((prev) =>
            prev.map((row, idx) =>
                idx === index ? { ...row, [field]: value } : row
            )
        );
    };

    const handleScheduleImageUpload = async (file) => {
        if (!file || !authToken || !serviceId) return;
        try {
            setIsUploadingImage(true);
            const data = await uploadServiceScheduleImage(
                authToken,
                serviceId,
                file
            );
            setScheduleImage(data?.scheduleImage || '');
            toast.success('Cuadrante actualizado');
            if (onServiceUpdate) {
                await onServiceUpdate();
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo subir el cuadrante');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleScheduleViewChange = async (nextView) => {
        if (!authToken || !serviceId) return;
        try {
            setIsSavingScheduleView(true);
            await fetchEditServiceServices(
                serviceId,
                { scheduleView: nextView },
                authToken
            );
            setScheduleView(nextView);
            if (onServiceUpdate) {
                await onServiceUpdate();
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar la vista');
        } finally {
            setIsSavingScheduleView(false);
        }
    };

    const addTemplateRow = () => {
        setTemplateRows((prev) => [
            ...prev,
            {
                weekday: 1,
                startTime: '18:00',
                endTime: '08:00',
                slots: 1,
                shiftTypeId: defaultShiftTypeId,
            },
        ]);
    };

    const removeTemplateRow = (index) => {
        setTemplateRows((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleSaveTemplate = async () => {
        try {
            setIsSavingTemplate(true);
            await saveServiceScheduleTemplates(
                authToken,
                serviceId,
                month,
                templateRows
            );
            toast.success('Plantilla guardada');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar la plantilla');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleApplyTemplate = async () => {
        try {
            setIsApplyingTemplate(true);
            await applyServiceScheduleTemplate(
                authToken,
                serviceId,
                month,
                applyStartDate
            );
            toast.success('Plantilla aplicada');
            await loadShifts();
        } catch (error) {
            toast.error(error.message || 'No se pudo aplicar la plantilla');
        } finally {
            setIsApplyingTemplate(false);
        }
    };

    const handleShiftUpdate = async (shiftId, updates) => {
        if (isSimulationActive) {
            setShifts((prev) =>
                prev.map((shift) =>
                    shift.id === shiftId ? { ...shift, ...updates } : shift
                )
            );
            return;
        }
        try {
            const updateShift = (allowOverlap = false) =>
                updateServiceScheduleShift(authToken, serviceId, shiftId, {
                    ...updates,
                    allowOverlap,
                });
            let data;
            try {
                data = await updateShift(false);
            } catch (error) {
                if (!(await requestShiftOverlapConfirmation(error))) throw error;
                data = await updateShift(true);
            }
            setShifts((prev) =>
                prev.map((shift) => (shift.id === shiftId ? { ...shift, ...data } : shift))
            );
            toast.success('Turno actualizado');
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar el turno');
        }
    };

    const handleShiftDelete = async (shiftId) => {
        if (isSimulationActive) {
            setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
            if (selectedShift?.id === shiftId) {
                setSelectedShift(null);
            }
            return;
        }
        if (!isPersistedShiftId(shiftId)) {
            setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
            if (selectedShift?.id === shiftId) {
                setSelectedShift(null);
            }
            return;
        }
        try {
            await deleteServiceScheduleShift(authToken, serviceId, shiftId);
            setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
            toast.success('Turno eliminado');
            if (selectedShift?.id === shiftId) {
                setSelectedShift(null);
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el turno');
        }
    };

    const handleCreateShift = async (event) => {
        event.preventDefault();
        if (isSimulationActive) {
            toast.error('Desactiva la simulacion para crear turnos nuevos.');
            return;
        }
        try {
            const createShift = (allowOverlap = false) =>
                createServiceScheduleShift(authToken, serviceId, {
                    ...newShift,
                    allowOverlap,
                });
            let data;
            try {
                data = await createShift(false);
            } catch (error) {
                if (!(await requestShiftOverlapConfirmation(error))) throw error;
                data = await createShift(true);
            }
            setShifts((prev) => [data, ...prev]);
            toast.success('Turno creado');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el turno');
        }
    };

    const handleSelectedShiftUpdate = async () => {
        if (!selectedShift?.id) return;
        if (isSimulationActive) {
            setShifts((prev) =>
                prev.map((shift) =>
                    shift.id === selectedShift.id ? { ...shift, ...selectedShift } : shift
                )
            );
            toast.success('Turno actualizado');
            return;
        }
        try {
            setIsSavingShift(true);
            const payload = {
                    scheduleDate: selectedShift.scheduleDate,
                    startTime: selectedShift.startTime,
                    endTime: selectedShift.endTime,
                    hours: selectedShift.hours,
                    employeeId: selectedShift.employeeId || null,
                    shiftTypeId: selectedShift.shiftTypeId || null,
                };
            const updateShift = (allowOverlap = false) =>
                updateServiceScheduleShift(authToken, serviceId, selectedShift.id, {
                    ...payload,
                    allowOverlap,
                });
            let data;
            try {
                data = await updateShift(false);
            } catch (error) {
                if (!(await requestShiftOverlapConfirmation(error))) throw error;
                data = await updateShift(true);
            }
            setShifts((prev) =>
                prev.map((shift) =>
                    shift.id === selectedShift.id ? { ...shift, ...data } : shift
                )
            );
            toast.success('Turno actualizado');
            setSelectedShift((prev) => (prev ? { ...prev, ...data } : prev));
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar el turno');
        } finally {
            setIsSavingShift(false);
        }
    };

    const handleSelectedShiftDelete = async () => {
        if (!selectedShift?.id) return;
        await handleShiftDelete(selectedShift.id);
    };

    const handleSimulateSchedule = async () => {
        if (!authToken || !serviceId) return;
        try {
            setIsSimulating(true);
            const data = await simulateServiceSchedule(authToken, serviceId, month);
            setShifts(Array.isArray(data?.shifts) ? data.shifts : []);
            setIsSimulationActive(true);
            setIsGridOpen(true);
            toast.success('Simulacion generada');
        } catch (error) {
            toast.error(error.message || 'No se pudo simular el cuadrante');
        } finally {
            setIsSimulating(false);
        }
    };

    const handleApplySimulation = async () => {
        if (!authToken || !serviceId || !isSimulationActive) return;
        try {
            setIsApplyingSimulation(true);
            const applySimulation = (allowOverlap = false) =>
                applyServiceScheduleSimulation(authToken, serviceId, month, shifts, {
                    allowOverlap,
                });
            try {
                await applySimulation(false);
            } catch (error) {
                if (!(await requestShiftOverlapConfirmation(error))) throw error;
                await applySimulation(true);
            }
            toast.success('Cuadrante aplicado');
            setIsSimulationActive(false);
            await loadShifts();
        } catch (error) {
            toast.error(error.message || 'No se pudo aplicar la simulacion');
        } finally {
            setIsApplyingSimulation(false);
        }
    };

    const handleCancelSimulation = async () => {
        setIsSimulationActive(false);
        await loadShifts();
    };

    const buildHolidayPayload = (holidayDate, scope, customName = '') => {
        const label = holidayScopeLabels[scope] || 'Festivo';
        return {
            holidayDate,
            scope,
            name: customName?.trim() || `Festivo ${label.toLowerCase()}`,
            autonomousCommunity:
                scope === 'autonomous' || scope === 'local'
                    ? serviceInfo?.autonomousCommunity || ''
                    : null,
            province: scope === 'local' ? serviceInfo?.province || '' : null,
            city: scope === 'local' ? serviceInfo?.city || '' : null,
        };
    };

    const handleCreateHoliday = async (event) => {
        event?.preventDefault();
        if (!holidayDraft.holidayDate) {
            toast.error('Selecciona una fecha de festivo');
            return;
        }
        try {
            setIsSavingHoliday(true);
            await createHoliday(
                authToken,
                buildHolidayPayload(
                    holidayDraft.holidayDate,
                    holidayDraft.scope,
                    holidayDraft.name
                )
            );
            toast.success('Festivo añadido');
            setHolidayDraft((prev) => ({ ...prev, name: '' }));
            await loadHolidays();
            await loadShifts();
        } catch (error) {
            toast.error(error.message || 'No se pudo añadir el festivo');
        } finally {
            setIsSavingHoliday(false);
        }
    };

    const handleHolidayDrop = async (dateKey, scope) => {
        try {
            await createHoliday(authToken, buildHolidayPayload(dateKey, scope));
            toast.success(`Festivo ${holidayScopeLabels[scope] || ''} añadido`);
            await loadHolidays();
            await loadShifts();
        } catch (error) {
            toast.error(error.message || 'No se pudo añadir el festivo');
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
            toast.success('Festivo eliminado');
            await loadHolidays();
            await loadShifts();
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el festivo');
        }
    };

    const handleExcelPreview = async () => {
        if (!scheduleImportFile) {
            toast.error('Selecciona un archivo Excel.');
            return;
        }

        try {
            setIsPreviewingImport(true);
            const data = await importServiceScheduleExcel(
                authToken,
                serviceId,
                month,
                scheduleImportFile,
                {
                    apply: false,
                    replace: replaceImportedMonth,
                    employeeMappings: employeeImportMappings,
                }
            );
            setScheduleImportPreview(data);
            const nextMappings = { ...employeeImportMappings };
            (data.unmatchedEmployees || []).forEach((item) => {
                if (nextMappings[item.excelName]) return;
                const suggestion = item.suggestions?.[0];
                if (suggestion) nextMappings[item.excelName] = suggestion.id;
            });
            setEmployeeImportMappings(nextMappings);
            toast.success('Excel leido correctamente');
        } catch (error) {
            toast.error(error.message || 'No se pudo leer el Excel');
        } finally {
            setIsPreviewingImport(false);
        }
    };

    const handleExcelApply = async () => {
        if (!scheduleImportFile) {
            toast.error('Selecciona un archivo Excel.');
            return;
        }

        const missingMappings = (scheduleImportPreview?.unmatchedEmployees || [])
            .filter((item) => !employeeImportMappings[item.excelName]);
        if (missingMappings.length) {
            toast.error('Asigna los trabajadores sin emparejar.');
            return;
        }

        try {
            setIsApplyingImport(true);
            const applyImport = (allowOverlap = false) =>
                importServiceScheduleExcel(
                    authToken,
                    serviceId,
                    month,
                    scheduleImportFile,
                    {
                        apply: true,
                        replace: replaceImportedMonth,
                        employeeMappings: employeeImportMappings,
                        allowOverlap,
                    }
                );
            let data;
            try {
                data = await applyImport(false);
            } catch (error) {
                if (!(await requestShiftOverlapConfirmation(error))) throw error;
                data = await applyImport(true);
            }
            setScheduleImportPreview(data);
            toast.success(`Cuadrante importado: ${data.shiftCount} turnos`);
            await loadShifts();
            if (onServiceUpdate) {
                await onServiceUpdate();
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo importar el Excel');
        } finally {
            setIsApplyingImport(false);
        }
    };

    const handleShiftTypeCreate = async () => {
        const trimmedName = newShiftType.name.trim();
        if (!trimmedName) {
            toast.error('El nombre del tipo es obligatorio');
            return;
        }

        try {
            setIsSavingShiftType(true);
            const data = await createServiceShiftType(authToken, serviceId, {
                name: trimmedName,
                color: newShiftType.color,
            });
            setShiftTypes((prev) => [...prev, data]);
            setNewShiftType({ name: '', color: newShiftType.color });
            toast.success('Tipo de turno creado');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el tipo');
        } finally {
            setIsSavingShiftType(false);
        }
    };

    const handleShiftTypeUpdate = async (typeId, updates) => {
        try {
            const data = await updateServiceShiftType(
                authToken,
                serviceId,
                typeId,
                updates
            );
            setShiftTypes((prev) =>
                prev.map((type) => (type.id === typeId ? { ...type, ...data } : type))
            );
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar el tipo');
        }
    };

    const handleShiftTypeDelete = async (typeId) => {
        try {
            await deleteServiceShiftType(authToken, serviceId, typeId);
            setShiftTypes((prev) => prev.filter((type) => type.id !== typeId));
            toast.success('Tipo eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el tipo');
        }
    };

    return (
        <section className='service-schedule-panel'>
            <header className='service-schedule-header'>
                <div>
                    <h2>Cuadrante mensual</h2>
                    <p>Define plantilla semanal y genera turnos del mes.</p>
                </div>
                <div className='service-schedule-month'>
                    <label htmlFor='schedule-month'>Mes</label>
                    <input
                        id='schedule-month'
                        type='month'
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                    />
                </div>
            </header>

            <div className='service-schedule-section'>
                <div className='service-schedule-section-header'>
                    <div>
                        <h3>Tipos de turno</h3>
                        <p>Define colores y etiquetas para el cuadrante.</p>
                    </div>
                </div>
                <div className='service-schedule-types'>
                    {shiftTypes.length ? (
                        shiftTypes.map((type) => (
                            <div className='service-schedule-type-row' key={type.id}>
                                <input
                                    className='service-schedule-type-name'
                                    type='text'
                                    value={type.name}
                                    onChange={(event) =>
                                        handleShiftTypeUpdate(type.id, {
                                            name: event.target.value,
                                        })
                                    }
                                />
                                <input
                                    className='service-schedule-type-color'
                                    type='color'
                                    value={type.color || '#38bdf8'}
                                    onChange={(event) =>
                                        handleShiftTypeUpdate(type.id, {
                                            color: event.target.value,
                                        })
                                    }
                                />
                                <button
                                    type='button'
                                    className='service-schedule-type-delete'
                                    onClick={() => handleShiftTypeDelete(type.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className='service-schedule-empty'>
                            Aun no hay tipos de turno.
                        </p>
                    )}
                </div>
                <div className='service-schedule-type-new'>
                    <input
                        type='text'
                        placeholder='Nuevo tipo (ej: Noche)'
                        value={newShiftType.name}
                        onChange={(event) =>
                            setNewShiftType((prev) => ({
                                ...prev,
                                name: event.target.value,
                            }))
                        }
                    />
                    <input
                        type='color'
                        value={newShiftType.color}
                        onChange={(event) =>
                            setNewShiftType((prev) => ({
                                ...prev,
                                color: event.target.value,
                            }))
                        }
                    />
                    <button
                        type='button'
                        onClick={handleShiftTypeCreate}
                        disabled={isSavingShiftType}
                    >
                        {isSavingShiftType ? 'Guardando...' : 'Agregar tipo'}
                    </button>
                </div>
            </div>

            <div className='service-schedule-section'>
                <div className='service-schedule-section-header'>
                    <h3>Plantilla semanal</h3>
                    <button type='button' onClick={addTemplateRow}>
                        Añadir fila
                    </button>
                </div>
                {templateRows.length ? (
                    <div className='service-schedule-template-grid'>
                        {templateRows.map((row, index) => (
                            <div key={`${row.weekday}-${index}`} className='service-schedule-template-row'>
                                <select
                                    value={row.weekday}
                                    onChange={(event) =>
                                        handleTemplateChange(
                                            index,
                                            'weekday',
                                            Number(event.target.value)
                                        )
                                    }
                                >
                                    {weekdayOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type='time'
                                    value={row.startTime}
                                    onChange={(event) =>
                                        handleTemplateChange(index, 'startTime', event.target.value)
                                    }
                                />
                                <input
                                    type='time'
                                    value={row.endTime}
                                    onChange={(event) =>
                                        handleTemplateChange(index, 'endTime', event.target.value)
                                    }
                                />
                                <input
                                    type='number'
                                    min='1'
                                    value={row.slots}
                                    onChange={(event) =>
                                        handleTemplateChange(
                                            index,
                                            'slots',
                                            Number(event.target.value)
                                        )
                                    }
                                />
                                <select
                                    value={row.shiftTypeId || ''}
                                    onChange={(event) =>
                                        handleTemplateChange(
                                            index,
                                            'shiftTypeId',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value=''>Sin tipo</option>
                                    {shiftTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type='button'
                                    className='service-schedule-row-delete'
                                    onClick={() => removeTemplateRow(index)}
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className='service-schedule-empty'>Sin plantilla para este mes.</p>
                )}
                <div className='service-schedule-actions'>
                    <button type='button' onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                        {isSavingTemplate ? 'Guardando...' : 'Guardar plantilla'}
                    </button>
                    <div className='service-schedule-apply'>
                        <label htmlFor='apply-start-date'>Aplicar desde</label>
                        <input
                            id='apply-start-date'
                            type='date'
                            value={applyStartDate}
                            onChange={(event) => setApplyStartDate(event.target.value)}
                        />
                        <button type='button' onClick={handleApplyTemplate} disabled={isApplyingTemplate}>
                            {isApplyingTemplate ? 'Aplicando...' : 'Aplicar al mes'}
                        </button>
                    </div>
                </div>
                <div className='service-schedule-simulate'>
                    <button
                        type='button'
                        className='service-schedule-simulate-btn'
                        onClick={handleSimulateSchedule}
                        disabled={isSimulating}
                    >
                        {isSimulating ? 'Simulando...' : 'Simular cuadrante'}
                    </button>
                    {isSimulationActive && (
                        <>
                            <button
                                type='button'
                                className='service-schedule-simulate-btn service-schedule-simulate-btn--primary'
                                onClick={handleApplySimulation}
                                disabled={isApplyingSimulation}
                            >
                                {isApplyingSimulation ? 'Aplicando...' : 'Aplicar cuadrante'}
                            </button>
                            <button
                                type='button'
                                className='service-schedule-simulate-btn service-schedule-simulate-btn--ghost'
                                onClick={handleCancelSimulation}
                                disabled={isApplyingSimulation}
                            >
                                Cancelar simulacion
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className='service-schedule-section'>
                <div className='service-schedule-section-header'>
                    <div>
                        <h3>Importar Excel</h3>
                        <p>
                            Sube un cuadrante con formato SYUSO para convertirlo
                            en turnos del mes seleccionado.
                        </p>
                    </div>
                </div>
                <div className='service-schedule-import'>
                    <input
                        type='file'
                        accept='.xlsx'
                        onChange={(event) => {
                            setScheduleImportFile(event.target.files?.[0] || null);
                            setScheduleImportPreview(null);
                            setEmployeeImportMappings({});
                        }}
                    />
                    <label className='service-schedule-import-replace'>
                        <input
                            type='checkbox'
                            checked={replaceImportedMonth}
                            onChange={(event) =>
                                setReplaceImportedMonth(event.target.checked)
                            }
                        />
                        Reemplazar turnos programados del mes
                    </label>
                    <div className='service-schedule-actions'>
                        <button
                            type='button'
                            onClick={handleExcelPreview}
                            disabled={!scheduleImportFile || isPreviewingImport}
                        >
                            {isPreviewingImport ? 'Leyendo...' : 'Previsualizar'}
                        </button>
                        <button
                            type='button'
                            onClick={handleExcelApply}
                            disabled={
                                !scheduleImportFile ||
                                isApplyingImport ||
                                (scheduleImportPreview?.unmatchedEmployees || [])
                                    .some(
                                        (item) =>
                                            !employeeImportMappings[
                                                item.excelName
                                            ]
                                    )
                            }
                        >
                            {isApplyingImport ? 'Importando...' : 'Aplicar Excel'}
                        </button>
                    </div>
                </div>
                {scheduleImportPreview ? (
                    <div className='service-schedule-import-preview'>
                        <div>
                            <strong>
                                {scheduleImportPreview.shiftCount} turnos
                                detectados
                            </strong>
                            <span>
                                Hoja: {scheduleImportPreview.worksheetName} ·
                                Servicio Excel:{' '}
                                {scheduleImportPreview.serviceName || '—'}
                                {scheduleImportPreview.duplicateShiftCount ? (
                                    <>
                                        {' '}
                                        · {scheduleImportPreview.duplicateShiftCount}{' '}
                                        duplicados ignorados
                                    </>
                                ) : null}
                                {scheduleImportPreview.skippedExistingShiftCount ? (
                                    <>
                                        {' '}
                                        ·{' '}
                                        {
                                            scheduleImportPreview.skippedExistingShiftCount
                                        }{' '}
                                        ya existian
                                    </>
                                ) : null}
                            </span>
                            <button
                                type='button'
                                className='service-schedule-simulate-btn service-schedule-simulate-btn--ghost'
                                onClick={() =>
                                    setShowImportGridPreview((prev) => !prev)
                                }
                            >
                                {showImportGridPreview
                                    ? 'Ocultar vista grafica'
                                    : 'Ver vista grafica'}
                            </button>
                        </div>
                        {scheduleImportPreview.unmatchedEmployees?.length ? (
                            <div className='service-schedule-import-warning'>
                                <strong>Asigna estos nombres del Excel:</strong>
                                {scheduleImportPreview.unmatchedEmployees.map(
                                    (item) => (
                                        <label
                                            className='service-schedule-import-match'
                                            key={item.excelName}
                                        >
                                            <span>
                                                En el Excel pone:{' '}
                                                <strong>{item.excelName}</strong>{' '}
                                                · {item.shiftCount} turnos
                                            </span>
                                            <select
                                                value={
                                                    employeeImportMappings[
                                                        item.excelName
                                                    ] || ''
                                                }
                                                onChange={(event) =>
                                                    setEmployeeImportMappings(
                                                        (prev) => ({
                                                            ...prev,
                                                            [item.excelName]:
                                                                event.target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                            >
                                                <option value=''>
                                                    Asignar esos turnos a...
                                                </option>
                                                {item.suggestions?.length ? (
                                                    <optgroup label='Sugeridos'>
                                                        {item.suggestions.map(
                                                            (employee) => (
                                                                <option
                                                                    key={
                                                                        employee.id
                                                                    }
                                                                    value={
                                                                        employee.id
                                                                    }
                                                                >
                                                                    ¿Quieres decir{' '}
                                                                    {
                                                                        employee.name
                                                                    }
                                                                    ?
                                                                </option>
                                                            )
                                                        )}
                                                    </optgroup>
                                                ) : null}
                                                <optgroup label='Todos'>
                                                    {employees.map(
                                                        (employee) => (
                                                            <option
                                                                key={
                                                                    employee.id
                                                                }
                                                                value={
                                                                    employee.id
                                                                }
                                                            >
                                                                {`${employee.firstName || ''} ${
                                                                    employee.lastName ||
                                                                    ''
                                                                }`.trim() ||
                                                                    employee.email}
                                                            </option>
                                                        )
                                                    )}
                                                </optgroup>
                                            </select>
                                        </label>
                                    )
                                )}
                            </div>
                        ) : (
                            <span className='service-schedule-import-ok'>
                                Trabajadores emparejados correctamente.
                            </span>
                        )}
                        {scheduleImportPreview.shifts?.length ? (
                            showImportGridPreview ? (
                                <ServiceScheduleGrid
                                    month={month}
                                    shifts={scheduleImportPreview.shifts.map(
                                        (shift, index) => ({
                                            ...shift,
                                            id: `${shift.employeeId}-${shift.scheduleDate}-${shift.startTime}-${index}`,
                                        })
                                    )}
                                    employees={importPreviewEmployees}
                                    absencesByEmployee={{}}
                                    holidaysByDate={holidaysByDate}
                                    readOnly
                                    showUnassigned={false}
                                    showAgreementHours={
                                        serviceInfo?.hourRuleType === 'convenio'
                                    }
                                />
                            ) : (
                            <div className='service-schedule-import-list'>
                                {scheduleImportPreview.shifts
                                    .slice(0, 10)
                                    .map((shift, index) => (
                                        <span
                                            key={`${shift.employeeId}-${shift.scheduleDate}-${index}`}
                                        >
                                            {shift.employeeName} ·{' '}
                                            {formatDateEs(
                                                shift.scheduleDate
                                            )}{' '}
                                            ·{' '}
                                            {formatTime(shift.startTime)}-
                                            {formatTime(shift.endTime)}
                                        </span>
                                    ))}
                                {scheduleImportPreview.shifts.length > 10 ? (
                                    <span>
                                        +{scheduleImportPreview.shifts.length - 10}{' '}
                                        turnos mas
                                    </span>
                                ) : null}
                            </div>
                            )
                        ) : null}
                    </div>
                ) : null}
            </div>

            <form className='service-schedule-new' onSubmit={handleCreateShift}>
                <h3>Crear turno manual</h3>
                <div className='service-schedule-new-grid'>
                    <input
                        type='date'
                        value={newShift.scheduleDate}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                scheduleDate: event.target.value,
                            }))
                        }
                        disabled={isSimulationActive}
                    />
                    <input
                        type='time'
                        value={newShift.startTime}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                startTime: event.target.value,
                            }))
                        }
                        disabled={isSimulationActive}
                    />
                    <input
                        type='time'
                        value={newShift.endTime}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                endTime: event.target.value,
                            }))
                        }
                        disabled={isSimulationActive}
                    />
                    <input
                        type='number'
                        step='0.25'
                        placeholder='Horas'
                        value={newShift.hours}
                        readOnly
                        disabled={isSimulationActive}
                    />
                    <select
                        value={newShift.employeeId}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                employeeId: event.target.value,
                            }))
                        }
                        disabled={isSimulationActive}
                    >
                        <option value=''>Sin asignar</option>
                        {employeeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={newShift.shiftTypeId}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                shiftTypeId: event.target.value,
                            }))
                        }
                        disabled={isSimulationActive}
                    >
                        <option value=''>Sin tipo</option>
                        {shiftTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <button type='submit' disabled={isSimulationActive}>
                    Crear turno
                </button>
            </form>

            <div className='service-schedule-section service-schedule-section--wide'>
                <div className='service-schedule-section-header service-schedule-section-header--split'>
                    <div>
                        <h3>Cuadrante (foto)</h3>
                        <p>
                            Sube una imagen del cuadrante y elige si los
                            empleados veran la foto o el cuadrante generado.
                        </p>
                    </div>
                    <div className='service-schedule-actions'>
                        <label className='service-schedule-upload'>
                            {isUploadingImage ? 'Subiendo...' : 'Subir foto'}
                            <input
                                type='file'
                                accept='image/png,image/jpeg'
                                onChange={(event) =>
                                    Promise.resolve(
                                        handleScheduleImageUpload(
                                            event.target.files?.[0]
                                        )
                                    ).finally(() => {
                                        event.target.value = '';
                                    })
                                }
                                disabled={isUploadingImage}
                            />
                        </label>
                        <div className='service-schedule-view-toggle'>
                            <button
                                type='button'
                                className={
                                    scheduleView === 'grid'
                                        ? 'is-active'
                                        : ''
                                }
                                onClick={() => handleScheduleViewChange('grid')}
                                disabled={isSavingScheduleView}
                            >
                                Mostrar cuadrante
                            </button>
                            <button
                                type='button'
                                className={
                                    scheduleView === 'image'
                                        ? 'is-active'
                                        : ''
                                }
                                onClick={() => handleScheduleViewChange('image')}
                                disabled={isSavingScheduleView}
                            >
                                Mostrar foto
                            </button>
                        </div>
                    </div>
                </div>
                <div className='service-schedule-image-preview'>
                    {scheduleView === 'image' && scheduleImage ? (
                        <a
                            href={`${import.meta.env.VITE_API_URL}/uploads/${scheduleImage}`}
                            target='_blank'
                            rel='noreferrer'
                        >
                            Ver foto actual
                        </a>
                    ) : (
                        <button
                            type='button'
                            className='service-schedule-image-preview-link'
                            onClick={() => setIsGridOpen(true)}
                        >
                            Ver cuadrante actual
                        </button>
                    )}
                </div>
                <div className='service-schedule-section-header'>
                    <div>
                        <h3>Vista mensual</h3>
                        <p>Arrastra y suelta turnos para reorganizar.</p>
                    </div>
                    <button
                        type='button'
                        className='service-schedule-open-grid'
                        onClick={() => setIsGridOpen(true)}
                    >
                        Ver cuadrante
                    </button>
                </div>
                <p className='service-schedule-help'>
                    Abre el cuadrante en una ventana completa para verlo sin recortes.
                </p>
            </div>

            {isGridOpen && (
                <div className='service-schedule-grid-modal'>
                    <button
                        type='button'
                        className='service-schedule-grid-modal__backdrop'
                        onClick={() => setIsGridOpen(false)}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='service-schedule-grid-modal__panel'>
                        <div className='service-schedule-grid-modal__header'>
                            <div>
                                <h3>Cuadrante mensual</h3>
                                <p>{month}</p>
                            </div>
                            <button
                                type='button'
                                className='service-schedule-grid-modal__close'
                                onClick={() => setIsGridOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='service-schedule-grid-modal__body'>
                            <div className='service-schedule-holidays'>
                                <div className='service-schedule-holidays__header'>
                                    <div>
                                        <strong>Festivos</strong>
                                        <span>Marca dias especiales en el cuadrante.</span>
                                    </div>
                                    <button
                                        type='button'
                                        className='service-schedule-holidays__toggle'
                                        onClick={() =>
                                            setIsHolidayToolsOpen((prev) => !prev)
                                        }
                                    >
                                        {isHolidayToolsOpen
                                            ? 'Ocultar festivos'
                                            : 'Anadir festivos'}
                                    </button>
                                </div>
                                {isHolidayToolsOpen && (
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
                                                    holidayDate: event.target.value,
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
                                            <option value='national'>Nacional</option>
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
                                        {isSavingHoliday ? 'Añadiendo...' : 'Añadir'}
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
                                )}
                            </div>
                            <ServiceScheduleGrid
                                month={month}
                                shifts={shifts}
                                employees={visibleEmployees}
                                absencesByEmployee={absencesByEmployee}
                                onShiftUpdate={handleShiftUpdate}
                                onSelectShift={setSelectedShift}
                                onHolidayDrop={handleHolidayDrop}
                                onHolidayClick={handleHolidayClick}
                                holidaysByDate={holidaysByDate}
                                showUnassigned={shifts.some((shift) => !shift.employeeId)}
                                showAgreementHours={
                                    serviceInfo?.hourRuleType === 'convenio'
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
            {selectedShift && (
                <div className='service-schedule-modal-overlay'>
                    <div className='service-schedule-modal'>
                        <div className='service-schedule-modal-header'>
                            <div>
                                <h3>Editar turno</h3>
                                <p>
                                    {selectedShift.scheduleDate} ·{' '}
                                    {formatTime(selectedShift.startTime)} -{' '}
                                    {formatTime(selectedShift.endTime)}
                                </p>
                            </div>
                            <button
                                type='button'
                                className='service-schedule-modal-close'
                                onClick={() => setSelectedShift(null)}
                            >
                                X
                            </button>
                        </div>
                        <div className='service-schedule-modal-grid'>
                            <label>
                                Fecha
                                <input
                                    type='date'
                                    value={selectedShift.scheduleDate || ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            scheduleDate: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Inicio
                                <input
                                    type='time'
                                    value={selectedShift.startTime || ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            startTime: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Fin
                                <input
                                    type='time'
                                    value={selectedShift.endTime || ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            endTime: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Horas
                                <input
                                    type='number'
                                    step='0.25'
                                    value={selectedShift.hours ?? ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            hours: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Empleado
                                <select
                                    value={selectedShift.employeeId || ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            employeeId: event.target.value,
                                        }))
                                    }
                                >
                                    <option value=''>Sin asignar</option>
                                    {employeeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Tipo de turno
                                <select
                                    value={selectedShift.shiftTypeId || ''}
                                    onChange={(event) =>
                                        setSelectedShift((prev) => ({
                                            ...prev,
                                            shiftTypeId: event.target.value,
                                        }))
                                    }
                                >
                                    <option value=''>Sin tipo</option>
                                    {shiftTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className='service-schedule-modal-actions'>
                            <button
                                type='button'
                                className='service-schedule-btn service-schedule-btn--ghost'
                                onClick={() => setSelectedShift(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type='button'
                                className='service-schedule-btn'
                                onClick={handleSelectedShiftUpdate}
                                disabled={isSavingShift}
                            >
                                {isSavingShift ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                                type='button'
                                className='service-schedule-btn service-schedule-btn--danger'
                                onClick={handleSelectedShiftDelete}
                            >
                                Eliminar
                            </button>
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
                                className='service-schedule-btn service-schedule-btn--ghost'
                                onClick={() => closeShiftOverlapModal(false)}
                            >
                                No, cancelar
                            </button>
                            <button
                                type='button'
                                className='service-schedule-btn'
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

export default ServiceSchedulePanel;
