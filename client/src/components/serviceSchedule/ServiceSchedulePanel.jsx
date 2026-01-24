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
    saveServiceScheduleTemplates,
    createServiceShiftType,
    updateServiceShiftType,
    deleteServiceShiftType,
    updateServiceScheduleShift,
    uploadServiceScheduleImage,
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

const ServiceSchedulePanel = ({
    serviceId,
    authToken,
    allowUnscheduledClockIn = false,
    scheduleImage: initialScheduleImage = '',
    scheduleView: initialScheduleView = 'grid',
    onServiceUpdate,
}) => {
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
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
    const [shiftTypes, setShiftTypes] = useState([]);
    const [isSavingShiftType, setIsSavingShiftType] = useState(false);
    const [newShiftType, setNewShiftType] = useState({ name: '', color: '#38bdf8' });
    const [absencesByEmployee, setAbsencesByEmployee] = useState({});
    const [selectedShift, setSelectedShift] = useState(null);
    const [isSavingShift, setIsSavingShift] = useState(false);
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [newShift, setNewShift] = useState({
        scheduleDate: toLocalDateInput(),
        startTime: '18:00',
        endTime: '08:00',
        hours: '',
        employeeId: '',
        shiftTypeId: '',
    });

    useEffect(() => {
        setScheduleImage(initialScheduleImage || '');
    }, [initialScheduleImage]);

    useEffect(() => {
        setScheduleView(initialScheduleView === 'image' ? 'image' : 'grid');
    }, [initialScheduleView]);

    const employeeOptions = useMemo(() => {
        return employees.map((employee) => ({
            value: employee.id,
            label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        }));
    }, [employees]);

    const shiftTypeOptions = useMemo(() => {
        return shiftTypes.map((type) => ({
            value: type.id,
            label: type.name,
            color: type.color,
        }));
    }, [shiftTypes]);

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
        if (!employees.length || !authToken) {
            setAbsencesByEmployee({});
            return;
        }

        const loadAbsences = async () => {
            try {
                const results = await Promise.all(
                    employees.map(async (employee) => {
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
    }, [authToken, employees, month]);

    useEffect(() => {
        if (!defaultShiftTypeId) return;
        setNewShift((prev) =>
            prev.shiftTypeId ? prev : { ...prev, shiftTypeId: defaultShiftTypeId }
        );
    }, [defaultShiftTypeId]);

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
        try {
            const data = await updateServiceScheduleShift(
                authToken,
                serviceId,
                shiftId,
                updates
            );
            setShifts((prev) =>
                prev.map((shift) => (shift.id === shiftId ? { ...shift, ...data } : shift))
            );
            toast.success('Turno actualizado');
        } catch (error) {
            toast.error(error.message || 'No se pudo actualizar el turno');
        }
    };

    const handleShiftDelete = async (shiftId) => {
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
        try {
            const data = await createServiceScheduleShift(authToken, serviceId, newShift);
            setShifts((prev) => [data, ...prev]);
            toast.success('Turno creado');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el turno');
        }
    };

    const handleSelectedShiftUpdate = async () => {
        if (!selectedShift?.id) return;
        try {
            setIsSavingShift(true);
            const data = await updateServiceScheduleShift(
                authToken,
                serviceId,
                selectedShift.id,
                {
                    scheduleDate: selectedShift.scheduleDate,
                    startTime: selectedShift.startTime,
                    endTime: selectedShift.endTime,
                    hours: selectedShift.hours,
                    employeeId: selectedShift.employeeId || null,
                    shiftTypeId: selectedShift.shiftTypeId || null,
                }
            );
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
                    />
                    <input
                        type='number'
                        step='0.25'
                        placeholder='Horas'
                        value={newShift.hours}
                        onChange={(event) =>
                            setNewShift((prev) => ({
                                ...prev,
                                hours: event.target.value,
                            }))
                        }
                    />
                    <select
                        value={newShift.employeeId}
                        onChange={(event) =>
                            setNewShift((prev) => ({
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
                    <select
                        value={newShift.shiftTypeId}
                        onChange={(event) =>
                            setNewShift((prev) => ({
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
                </div>
                <button type='submit'>Crear turno</button>
            </form>

            <div className='service-schedule-section service-schedule-section--wide'>
                {(allowUnscheduledClockIn || scheduleImage) && (
                    <div className='service-schedule-section-header service-schedule-section-header--split'>
                        <div>
                            <h3>Cuadrante (foto)</h3>
                            <p>
                                Muestra la imagen del cuadrante cuando el servicio
                                permite fichar sin cuadrante.
                            </p>
                        </div>
                        <div className='service-schedule-actions'>
                            <label className='service-schedule-upload'>
                                {isUploadingImage ? 'Subiendo...' : 'Subir cuadrante'}
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
                                    disabled={!allowUnscheduledClockIn || isUploadingImage}
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
                )}
                {(allowUnscheduledClockIn || scheduleImage) && (
                    <div className='service-schedule-image-preview'>
                        {scheduleImage ? (
                            <a
                                href={`${import.meta.env.VITE_API_URL}/uploads/${scheduleImage}`}
                                target='_blank'
                                rel='noreferrer'
                            >
                                Ver cuadrante actual
                            </a>
                        ) : (
                            <p>No hay cuadrante subido.</p>
                        )}
                    </div>
                )}
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
                            <ServiceScheduleGrid
                                month={month}
                                shifts={shifts}
                                employees={employees}
                                absencesByEmployee={absencesByEmployee}
                                onShiftUpdate={handleShiftUpdate}
                                onSelectShift={setSelectedShift}
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
        </section>
    );
};

export default ServiceSchedulePanel;
