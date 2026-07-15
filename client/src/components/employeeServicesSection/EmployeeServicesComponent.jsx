import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEmployeeAllServicesServices,
    fetchEmployeeScheduleShifts,
    fetchServiceScheduleShifts,
} from '../../services/serviceService.js';
import {
    fetchShiftRecordsEmployee,
    fetchStartShiftRecord,
} from '../../services/shiftRecordService.js';
import { fetchMyShiftSwapRequests } from '../../services/shiftSwapService.js';
import { createServiceNfcLog } from '../../services/nfcService.js';
import {
    createVehicleInspection,
    fetchServiceVehicles,
    fetchVehicleInspectionStatus,
} from '../../services/vehicleService.js';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import ServiceChat from '../serviceChat/ServiceChat.jsx';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import '../serviceSchedule/ServiceSchedulePanel.css';
import './EmployeeServicesComponent.css';

const LOCATION_CACHE_KEY = 'syuso_last_location';

const vehicleChecklistItems = [
    ['lights', 'Luces'],
    ['tires', 'Neumaticos'],
    ['bodywork', 'Carroceria'],
    ['interior', 'Interior'],
    ['oil', 'Aceite'],
    ['documents', 'Documentacion'],
    ['cleanliness', 'Limpieza'],
];

const getLocation = () =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalizacion no disponible'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = [
                    position.coords.latitude,
                    position.coords.longitude,
                ];
                try {
                    localStorage.setItem(
                        LOCATION_CACHE_KEY,
                        JSON.stringify(coords)
                    );
                } catch (error) {
                    // ignore storage errors
                }
                resolve(coords);
            },
            () => {
                try {
                    const cached = localStorage.getItem(
                        LOCATION_CACHE_KEY
                    );
                    if (cached) {
                        const coords = JSON.parse(cached);
                        if (
                            Array.isArray(coords) &&
                            coords.length === 2
                        ) {
                            resolve(coords);
                            return;
                        }
                    }
                } catch (error) {
                    // ignore cache errors
                }
                reject(new Error('No se pudo obtener la ubicacion'));
            },
            {
                enableHighAccuracy: false,
                timeout: 3000,
                maximumAge: 600000,
            }
        );
    });

const toBoolean = (value) =>
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true';

const decodeTextRecord = (record) => {
    try {
        if (typeof record.data === 'string') {
            return record.data;
        }

        if (record.data instanceof DataView) {
            const status = record.data.getUint8(0);
            const langLength = status & 0x3f;
            const encoding = status & 0x80 ? 'utf-16' : 'utf-8';
            const textBytes = new Uint8Array(
                record.data.buffer,
                record.data.byteOffset + 1 + langLength,
                record.data.byteLength - 1 - langLength
            );
            return new TextDecoder(encoding).decode(textBytes);
        }
    } catch (error) {
        return '';
    }
    return '';
};

const EmployeeServicesComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const navigate = useNavigate();
    const { resetServiceUnread } = useChatNotifications();

    const [services, setServices] = useState([]);
    const [type, setType] = useState('');
    const [openShifts, setOpenShifts] = useState({});
    const [openShiftDetails, setOpenShiftDetails] = useState([]);
    const [startingShifts, setStartingShifts] = useState({});
    const [openChats, setOpenChats] = useState({});
    const [readingNfc, setReadingNfc] = useState({});
    const [expandedAddress, setExpandedAddress] = useState({});
    const [locationWarning, setLocationWarning] = useState('');
    const scrollRestoreRef = useRef(0);
    const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
    const [loading, setLoading] = useState(false);
    const { unreadByService } = useChatNotifications();
    const [scheduleModal, setScheduleModal] = useState(null);
    const [vehicleModal, setVehicleModal] = useState(null);
    const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
    const [vehiclesByService, setVehiclesByService] = useState({});
    const [vehicleInspectedByService, setVehicleInspectedByService] = useState({});
    const [vehicleForm, setVehicleForm] = useState({
        vehicleId: '',
        odometerKm: '',
        fuelLevel: '',
        cleanliness: '',
        fuelLiters: '',
        fuelAmount: '',
        damageNotes: '',
        checklist: {},
        photos: [],
        tickets: [],
    });
    const [scheduleMonth] = useState(() =>
        new Date().toISOString().slice(0, 7)
    );
    const [scheduleShifts, setScheduleShifts] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [nextShiftByService, setNextShiftByService] = useState({});
    const [shiftRequests, setShiftRequests] = useState([]);

    const compareText = (a, b) =>
        String(a || '').localeCompare(String(b || ''), 'es', {
            sensitivity: 'base',
        });

    const formatOpenShiftDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const openLocationSettings = () => {
        if (typeof window === 'undefined') return;

        const userAgent = navigator.userAgent || '';
        if (/Android/i.test(userAgent)) {
            window.location.href =
                'intent://settings/location#Intent;scheme=android-app;end';
            return;
        }

        if (/iPhone|iPad|iPod/i.test(userAgent)) {
            window.location.href = 'app-settings:';
            return;
        }

        window.open('chrome://settings/content/location', '_blank');
    };

    useEffect(() => {
        const loadServices = async () => {
            if (!authToken) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (type) params.append('name', type);

                const data = await fetchEmployeeAllServicesServices(
                    params.toString(),
                    authToken
                );

                setServices(data || []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los servicios'
                );
            } finally {
                setLoading(false);
            }
        };

        loadServices();
    }, [authToken, type]);

    useEffect(() => {
        const loadShiftRequests = async () => {
            if (!authToken) return;
            try {
                const data = await fetchMyShiftSwapRequests(authToken);
                setShiftRequests(Array.isArray(data) ? data : []);
            } catch {
                setShiftRequests([]);
            }
        };

        loadShiftRequests();
    }, [authToken]);

    useEffect(() => {
        const loadNextShifts = async () => {
            if (!authToken || !services.length) {
                setNextShiftByService({});
                return;
            }

            const now = new Date();
            const formatNextShift = (date) =>
                new Intl.DateTimeFormat('es-ES', {
                    timeZone: 'Europe/Madrid',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(date);
            const toShiftDateTime = (dateKey, time) => {
                if (!dateKey || !time) return null;
                const dateTime = new Date(`${dateKey}T${time}`);
                return Number.isNaN(dateTime.getTime()) ? null : dateTime;
            };

            try {
                const results = await Promise.all(
                    services.map(async (service) => {
                        const serviceId = service.serviceId || service.id;
                        if (!serviceId) return [serviceId, null];

                        const data = await fetchEmployeeScheduleShifts(
                            authToken,
                            scheduleMonth,
                            false,
                            serviceId
                        );

                        const shifts = Array.isArray(data) ? data : [];
                        const earlyMinutes =
                            service.clockInEarlyMinutes != null
                                ? Number(service.clockInEarlyMinutes)
                                : 15;
                        const normalizedShifts = shifts
                            .map((shift) => {
                                if (!shift.scheduleDate || !shift.startTime) {
                                    return null;
                                }
                                const dateKey = String(
                                    shift.scheduleDate
                                ).slice(0, 10);
                                const dateTime = toShiftDateTime(
                                    dateKey,
                                    shift.startTime
                                );
                                const endDateTime = toShiftDateTime(
                                    dateKey,
                                    shift.endTime
                                );
                                if (!dateTime || !endDateTime) return null;
                                const finalEndDateTime =
                                    endDateTime <= dateTime
                                        ? new Date(
                                              endDateTime.getTime() +
                                                  24 * 60 * 60 * 1000
                                          )
                                        : endDateTime;
                                const windowStart = new Date(
                                    dateTime.getTime() -
                                        earlyMinutes * 60 * 1000
                                );
                                return {
                                    ...shift,
                                    dateTime,
                                    endDateTime: finalEndDateTime,
                                    canStart:
                                        now >= windowStart &&
                                        now <= finalEndDateTime,
                                };
                            })
                            .filter(
                                (shift) =>
                                    shift &&
                                    shift.dateTime instanceof Date &&
                                    !Number.isNaN(shift.dateTime.getTime())
                            );
                        const currentShift = normalizedShifts.find(
                            (shift) => shift.canStart
                        );
                        const nextShift = normalizedShifts
                            .filter((shift) => shift.dateTime >= now)
                            .sort(
                                (a, b) =>
                                    a.dateTime.getTime() -
                                    b.dateTime.getTime()
                            )[0];

                        if (!nextShift && !currentShift) {
                            return [
                                serviceId,
                                {
                                    label: null,
                                    canStart: toBoolean(
                                        service.allowUnscheduledClockIn
                                    ),
                                },
                            ];
                        }

                        const visibleShift = currentShift || nextShift;

                        return [
                            serviceId,
                            {
                                label: formatNextShift(visibleShift.dateTime),
                                canStart:
                                    Boolean(currentShift) ||
                                    toBoolean(service.allowUnscheduledClockIn),
                            },
                        ];
                    })
                );

                setNextShiftByService(Object.fromEntries(results));
            } catch (error) {
                // silent fail to avoid blocking the list
            }
        };

        loadNextShifts();
    }, [authToken, services, scheduleMonth]);

    useEffect(() => {
        const loadOpenShifts = async () => {
            if (!authToken) return;

            try {
                const data = await fetchShiftRecordsEmployee('', authToken);
                const open = {};
                const details = [];
                (data?.details || []).forEach((record) => {
                    if (!record.clockOut) {
                        open[record.serviceId] = record.id;
                        details.push(record);
                    }
                });
                setOpenShifts(open);
                setOpenShiftDetails(details);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los turnos'
                );
            }
        };

        loadOpenShifts();
    }, [authToken]);

    useEffect(() => {
        const loadServiceVehicles = async () => {
            if (!authToken || !services.length) {
                setVehiclesByService({});
                return;
            }

            const results = await Promise.all(
                services.map(async (service) => {
                    const serviceId = service.serviceId || service.id;
                    if (!serviceId) return [serviceId, []];

                    try {
                        const vehicles = await fetchServiceVehicles(
                            authToken,
                            serviceId
                        );
                        return [serviceId, Array.isArray(vehicles) ? vehicles : []];
                    } catch {
                        return [serviceId, []];
                    }
                })
            );

            setVehiclesByService(Object.fromEntries(results.filter(([id]) => id)));
        };

        loadServiceVehicles();
    }, [authToken, services]);

    const uniqueTypes = useMemo(
        () =>
            [...new Set(services
                .filter((item) => item.status !== 'completed')
                .map((item) => item.name))]
                .filter(Boolean)
                .sort(compareText),
        [services]
    );

    const visibleServices = useMemo(
        () => services.filter((service) => service.status !== 'completed'),
        [services]
    );

    const handleStart = async (serviceId) => {
        if (startingShifts[serviceId] || Object.keys(openShifts).length > 0) {
            return;
        }

        try {
            setStartingShifts((prev) => ({ ...prev, [serviceId]: true }));
            setLocationWarning('');
            const location = await getLocation();
            const response = await fetchStartShiftRecord(
                authToken,
                serviceId,
                user?.id,
                location,
                new Date().toISOString()
            );
            const shiftId =
                typeof response === 'string' ? response : response?.id;
            const responseServiceId =
                typeof response === 'string'
                    ? serviceId
                    : response?.serviceId || serviceId;

            if (shiftId) {
                setOpenShifts((prev) => ({
                    ...prev,
                    [responseServiceId]: shiftId,
                }));
                setOpenShiftDetails((prev) => {
                    if (prev.some((item) => item.id === shiftId)) return prev;
                    const service = services.find(
                        (item) =>
                            (item.serviceId || item.id) === responseServiceId
                    );
                    return [
                        {
                            id: shiftId,
                            serviceId: responseServiceId,
                            serviceName:
                                response?.serviceName ||
                                service?.name ||
                                service?.type ||
                                'Servicio',
                            clockIn:
                                response?.clockIn ||
                                response?.realClockIn ||
                                new Date().toISOString(),
                        },
                        ...prev,
                    ];
                });
            }

            toast.success(
                response?.alreadyOpen
                    ? 'Ya tenias un turno abierto'
                    : 'Inicio de servicio registrado'
            );
        } catch (error) {
            setLocationWarning(
                'Activa la ubicacion del movil para poder fichar.'
            );
            toast.error(error.message || 'No se pudo iniciar el servicio');
        } finally {
            setStartingShifts((prev) => ({ ...prev, [serviceId]: false }));
        }
    };

    const handleEnd = async (serviceId) => {
        const shiftId = openShifts[serviceId];
        if (!shiftId) {
            toast.error('No hay un turno abierto para este servicio');
            return;
        }

        let assignedVehicles = vehiclesByService[serviceId];
        if (!Array.isArray(assignedVehicles)) {
            try {
                assignedVehicles = await fetchServiceVehicles(
                    authToken,
                    serviceId
                );
                setVehiclesByService((prev) => ({
                    ...prev,
                    [serviceId]: Array.isArray(assignedVehicles)
                        ? assignedVehicles
                        : [],
                }));
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron comprobar los vehiculos del servicio'
                );
                return;
            }
        }

        if (assignedVehicles?.length && !vehicleInspectedByService[serviceId]) {
            try {
                const status = await fetchVehicleInspectionStatus(
                    authToken,
                    serviceId,
                    shiftId
                );

                if (!status.completed) {
                    toast.error(
                        'Antes de enviar el parte debes mandar el parte de inspeccion del vehiculo'
                    );
                    return;
                }

                setVehicleInspectedByService((prev) => ({
                    ...prev,
                    [serviceId]: true,
                }));
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudo comprobar el parte de vehiculo'
                );
                return;
            }
        }

        navigate(`/shiftRecords/${shiftId}/report?serviceId=${serviceId}`);
    };

    const toggleChat = (serviceId) => {
        setOpenChats((prev) => ({
            ...prev,
            [serviceId]: !prev[serviceId],
        }));
        resetServiceUnread(serviceId);
    };

    const toggleAddress = (serviceId) => {
        setExpandedAddress((prev) => ({
            ...prev,
            [serviceId]: !prev[serviceId],
        }));
    };

    const openScheduleModal = (service) => {
        const serviceId = service?.serviceId || service?.id;
        if (!serviceId) return;
        setScheduleModal({
            serviceId,
            serviceName: service?.name || service?.type || 'Servicio',
            scheduleImage: service?.scheduleImage || '',
            scheduleView: service?.scheduleView || 'grid',
        });
    };

    const closeScheduleModal = () => {
        setScheduleModal(null);
        setScheduleShifts([]);
    };

    const modalShiftRequests = useMemo(() => {
        if (!scheduleModal?.serviceId) return [];
        const [year, monthNumber] = scheduleMonth.split('-');
        const monthToken = `${monthNumber}/${year}`;
        return shiftRequests.filter((request) => {
            if (request.serviceId !== scheduleModal.serviceId) return false;
            if (!['pending_admin', 'approved'].includes(request.status)) {
                return false;
            }
            const summary = [
                request.fromShiftSummary,
                request.toShiftSummary,
            ]
                .filter(Boolean)
                .join(' ');
            return summary ? summary.includes(monthToken) : true;
        });
    }, [scheduleModal?.serviceId, scheduleMonth, shiftRequests]);

    const renderShiftRequestSummary = () => {
        if (!modalShiftRequests.length) return null;
        return (
            <div className='schedule-requests-summary'>
                <strong>Peticiones aprobadas o en aprobacion</strong>
                <div className='schedule-requests-summary__list'>
                    {modalShiftRequests.map((request) => (
                        <div
                            className='schedule-requests-summary__item'
                            key={request.id}
                        >
                            <span>
                                {request.status === 'approved'
                                    ? 'Aprobada'
                                    : 'Pendiente de aprobacion'}
                            </span>
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

    const handleReadNfc = async (serviceId) => {
        if (!('NDEFReader' in window)) {
            toast.error('NFC no disponible en este dispositivo');
            return;
        }

        const shiftId = openShifts[serviceId];
        if (!shiftId) {
            toast.error('No hay un turno abierto para este servicio');
            return;
        }

        try {
            setReadingNfc((prev) => ({ ...prev, [serviceId]: true }));
            const reader = new NDEFReader();
            const controller = new AbortController();
            await reader.scan({ signal: controller.signal });

            reader.onreading = async (event) => {
                controller.abort();
                const uid = event.serialNumber || '';
                let tagName = '';
                for (const record of event.message.records) {
                    if (record.recordType === 'text') {
                        tagName = decodeTextRecord(record);
                        break;
                    }
                }

                try {
                    const location = await getLocation();
                    await createServiceNfcLog(
                        serviceId,
                        {
                            shiftRecordId: shiftId,
                            tagUid: uid,
                            tagName,
                            locationCoords: location,
                        },
                        authToken
                    );
                    toast.success('Lectura NFC registrada');
                } catch (error) {
                    toast.error(
                        error.message || 'No se pudo guardar la lectura NFC'
                    );
                } finally {
                    setReadingNfc((prev) => ({ ...prev, [serviceId]: false }));
                }
            };

            reader.onreadingerror = () => {
                toast.error('No se pudo leer el tag');
                setReadingNfc((prev) => ({ ...prev, [serviceId]: false }));
            };
        } catch (error) {
            toast.error('No se pudo iniciar la lectura NFC');
            setReadingNfc((prev) => ({ ...prev, [serviceId]: false }));
        }
    };

    const openVehicleModal = async (service) => {
        const serviceId = service.serviceId || service.id;
        if (!serviceId) return;
        try {
            const vehicles = await fetchServiceVehicles(authToken, serviceId);
            if (!vehicles.length) {
                toast.error('Este servicio no tiene vehiculos asignados');
                return;
            }
            setVehicleModal({
                serviceId,
                serviceName: service.name || service.type || 'Servicio',
                vehicles,
            });
            setVehicleForm({
                vehicleId: vehicles[0]?.id || '',
                odometerKm: '',
                fuelLevel: '',
                cleanliness: '',
                fuelLiters: '',
                fuelAmount: '',
                damageNotes: '',
                checklist: {},
                photos: [],
                tickets: [],
            });
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar vehiculos');
        }
    };

    const closeVehicleModal = () => {
        setVehicleModal(null);
        setVehicleForm((prev) => ({
            ...prev,
            photos: [],
            tickets: [],
        }));
    };

    const toggleVehicleChecklist = (key) => {
        setVehicleForm((prev) => ({
            ...prev,
            checklist: {
                ...prev.checklist,
                [key]: !prev.checklist[key],
            },
        }));
    };

    const submitVehicleInspection = async (event) => {
        event.preventDefault();
        if (vehicleSubmitting) return;
        if (!vehicleModal?.serviceId || !vehicleForm.vehicleId) return;
        try {
            setVehicleSubmitting(true);
            await createVehicleInspection({
                authToken,
                serviceId: vehicleModal.serviceId,
                vehicleId: vehicleForm.vehicleId,
                payload: {
                    odometerKm: vehicleForm.odometerKm,
                    fuelLevel: vehicleForm.fuelLevel,
                    cleanliness: vehicleForm.cleanliness,
                    fuelLiters: vehicleForm.fuelLiters,
                    fuelAmount: vehicleForm.fuelAmount,
                    damageNotes: vehicleForm.damageNotes,
                    checklist: JSON.stringify(vehicleForm.checklist),
                },
                photos: vehicleForm.photos,
                tickets: vehicleForm.tickets,
            });
            setVehicleInspectedByService((prev) => ({
                ...prev,
                [vehicleModal.serviceId]: true,
            }));
            toast.success('Parte de vehiculo enviado');
            closeVehicleModal();
        } catch (error) {
            toast.error(error.message || 'No se pudo enviar el parte');
        } finally {
            setVehicleSubmitting(false);
        }
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                scrollRestoreRef.current = window.scrollY || 0;
                if (
                    document.activeElement &&
                    typeof document.activeElement.blur === 'function'
                ) {
                    document.activeElement.blur();
                }
                return;
            }

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollRestoreRef.current || 0);
            });
        };

        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange
        );
        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
        };
    }, []);

    useEffect(() => {
        const loadScheduleShifts = async () => {
            if (!authToken || !scheduleModal?.serviceId) return;
            if (
                scheduleModal.scheduleView === 'image' &&
                scheduleModal.scheduleImage
            ) {
                setScheduleShifts([]);
                return;
            }
            try {
                setScheduleLoading(true);
                const data = await fetchServiceScheduleShifts(
                    authToken,
                    scheduleModal.serviceId,
                    scheduleMonth,
                );
                setScheduleShifts(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los turnos'
                );
            } finally {
                setScheduleLoading(false);
            }
        };

        loadScheduleShifts();
    }, [authToken, scheduleModal, scheduleMonth]);

    const scheduleEmployees = useMemo(() => {
        const employeeMap = new Map();
        scheduleShifts.forEach((shift) => {
            if (!shift.employeeId || employeeMap.has(shift.employeeId)) return;
            employeeMap.set(shift.employeeId, {
                id: shift.employeeId,
                firstName: shift.firstName || 'Empleado',
                lastName: shift.lastName || '',
            });
        });
        return Array.from(employeeMap.values()).sort((a, b) =>
            `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(
                `${b.firstName || ''} ${b.lastName || ''}`,
                'es',
                { sensitivity: 'base' }
            )
        );
    }, [scheduleShifts]);

    return (
        <section className='employee-services'>
            {locationWarning && (
                <div className='employee-services-location-warning'>
                    <span>{locationWarning}</span>
                    <button type='button' onClick={openLocationSettings}>
                        Activar ubicacion
                    </button>
                </div>
            )}

            {openShiftDetails.length ? (
                <div className='employee-services-open-warning'>
                    <div>
                        <strong>Tienes turnos abiertos</strong>
                        <p>
                            Cierra el turno pendiente antes de iniciar otro
                            servicio.
                        </p>
                    </div>
                    <div className='employee-services-open-warning__list'>
                        {openShiftDetails.map((record) => (
                            <button
                                key={record.id}
                                type='button'
                                onClick={() =>
                                    navigate(
                                        `/shiftRecords/${record.id}/report?serviceId=${record.serviceId}`
                                    )
                                }
                            >
                                {record.serviceName || 'Servicio'} ·{' '}
                                {formatOpenShiftDate(
                                    record.realClockIn || record.clockIn
                                ) || 'turno abierto'}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className='employee-services-header'>
                <div>
                    <h1>Servicios asignados</h1>
                    <p>Gestiona tus servicios y registra entradas y salidas.</p>
                </div>
                <form className='employee-services-filters'>
                    <div className='employee-services-filter'>
                        <label htmlFor='type'>Servicio</label>
                        <select
                            id='type'
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            {uniqueTypes.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>
                </form>
            </div>

            {loading ? (
                <p className='employee-services-loading'>
                    Cargando servicios...
                </p>
            ) : (
                <ul className='employee-services-list'>
                    {visibleServices.map((service) => {
                        const serviceId = service.serviceId || service.id;
                        if (!serviceId) return null;
                        const isOpen = Boolean(openShifts[serviceId]);
                        const hasAssignedVehicle = Boolean(
                            vehiclesByService[serviceId]?.length
                        );
                        const hasNfc = Number(service.nfcCount || 0) > 0;
                        const nextShiftInfo = nextShiftByService[serviceId];
                        const startDisabled =
                            startingShifts[serviceId] ||
                            Object.keys(openShifts).length > 0 ||
                            isOpen ||
                            (nextShiftInfo &&
                                nextShiftInfo.label &&
                                !nextShiftInfo.canStart);
                        return (
                            <li key={serviceId} className='employee-card'>
                                <div className='employee-card-row'>
                                    <div>
                                        <div className='employee-card-title'>
                                            <h3
                                                className='notranslate'
                                                translate='no'
                                            >
                                                {service.name || service.type}
                                            </h3>
                                            <button
                                                type='button'
                                                className='employee-card-toggle'
                                                onClick={() =>
                                                    toggleAddress(
                                                        serviceId
                                                    )
                                                }
                                                aria-expanded={
                                                    expandedAddress[
                                                        serviceId
                                                    ]
                                                        ? 'true'
                                                        : 'false'
                                                }
                                            >
                                                {expandedAddress[serviceId]
                                                    ? '-'
                                                    : '+'}
                                            </button>
                                        </div>
                                        {expandedAddress[serviceId] ? (
                                            <p>
                                                {service.locationLink ? (
                                                    <>
                                                        Ubicacion:{' '}
                                                        <a
                                                            href={service.locationLink}
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            Ver ubicacion
                                                        </a>
                                                    </>
                                                ) : (
                                                    <>
                                                        Direccion:{' '}
                                                        {service.address},{' '}
                                                        {service.city}
                                                    </>
                                                )}
                                            </p>
                                        ) : null}
                                        {nextShiftInfo?.label ? (
                                            <p className='employee-card-next-shift'>
                                                Tu proximo turno es:{' '}
                                                {nextShiftInfo.label}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className='employee-card-actions'>
                                        <button
                                            type='button'
                                            className='employee-btn employee-btn--start'
                                            onClick={() =>
                                                handleStart(serviceId)
                                            }
                                            disabled={startDisabled}
                                        >
                                            {startingShifts[serviceId]
                                                ? 'Iniciando...'
                                                : isOpen
                                                ? 'En curso'
                                                : 'Iniciar'}
                                        </button>
                                        {isOpen ? (
                                            <button
                                                type='button'
                                                className='employee-btn employee-btn--end'
                                                onClick={() =>
                                                    handleEnd(serviceId)
                                                }
                                            >
                                                Parte de trabajo
                                            </button>
                                        ) : null}
                                        <button
                                            type='button'
                                            className='employee-btn employee-btn--chat'
                                            onClick={() =>
                                                toggleChat(serviceId)
                                            }
                                        >
                                            {openChats[serviceId]
                                                ? 'Cerrar chat'
                                                : 'Chat'}
                                            {unreadByService?.[serviceId] ? (
                                                <span className='employee-chat-badge'>
                                                    {unreadByService[
                                                        serviceId
                                                    ]}
                                                </span>
                                            ) : null}
                                        </button>
                                        {isOpen && hasAssignedVehicle ? (
                                            <button
                                                type='button'
                                                className='employee-btn employee-btn--vehicle'
                                                onClick={() =>
                                                    openVehicleModal(service)
                                                }
                                            >
                                                {vehicleInspectedByService[
                                                    serviceId
                                                ]
                                                    ? 'Vehiculo ok'
                                                    : 'Vehiculo'}
                                            </button>
                                        ) : null}
                                        {isOpen && hasNfc ? (
                                            <button
                                                type='button'
                                                className='employee-btn employee-btn--nfc'
                                                onClick={() =>
                                                    handleReadNfc(
                                                        serviceId
                                                    )
                                                }
                                                disabled={
                                                    readingNfc[
                                                        serviceId
                                                    ] || !nfcSupported
                                                }
                                            >
                                                {readingNfc[serviceId]
                                                    ? 'Leyendo NFC...'
                                                    : 'Leer NFC'}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                                <div className='employee-card-schedule'>
                                    <button
                                        type='button'
                                        className='employee-card-schedule-btn'
                                        onClick={() =>
                                            openScheduleModal(service)
                                        }
                                    >
                                        Ver cuadrante
                                    </button>
                                </div>
                                {openChats[serviceId] && (
                                    <ServiceChat
                                        serviceId={serviceId}
                                        title={`Chat: ${service.name || service.type || ''}`}
                                        compact
                                        manageRoom={false}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {scheduleModal && (
                <div className='service-schedule-grid-modal'>
                    <button
                        type='button'
                        className='service-schedule-grid-modal__backdrop'
                        onClick={closeScheduleModal}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='service-schedule-grid-modal__panel'>
                        <div className='service-schedule-grid-modal__header'>
                            <div>
                                <h3>
                                    <span
                                        className='notranslate'
                                        translate='no'
                                    >
                                        Cuadrante: {scheduleModal.serviceName}
                                    </span>
                                </h3>
                                <p>{scheduleMonth}</p>
                            </div>
                            <button
                                type='button'
                                className='service-schedule-grid-modal__close'
                                onClick={closeScheduleModal}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='service-schedule-grid-modal__body'>
                            {renderShiftRequestSummary()}
                            {scheduleModal.scheduleView === 'image' &&
                            scheduleModal.scheduleImage ? (
                                <div className='employee-schedule-image'>
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/uploads/${scheduleModal.scheduleImage}`}
                                        alt={`Cuadrante de ${scheduleModal.serviceName}`}
                                    />
                                </div>
                            ) : scheduleLoading ? (
                                <p>Cargando turnos...</p>
                            ) : scheduleShifts.length ? (
                                <ServiceScheduleGrid
                                    month={scheduleMonth}
                                    shifts={scheduleShifts}
                                    employees={scheduleEmployees}
                                    absencesByEmployee={{}}
                                    onShiftUpdate={() => {}}
                                    readOnly
                                    showUnassigned={false}
                                />
                            ) : (
                                <p>Sin turnos para este mes.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {vehicleModal && (
                <div className='vehicle-inspection-modal'>
                    <button
                        type='button'
                        className='vehicle-inspection-modal__backdrop'
                        onClick={closeVehicleModal}
                        aria-label='Cerrar parte de vehiculo'
                    />
                    <form
                        className='vehicle-inspection-modal__panel'
                        onSubmit={submitVehicleInspection}
                    >
                        <header className='vehicle-inspection-modal__header'>
                            <div>
                                <h3>Parte de vehiculo</h3>
                                <p>{vehicleModal.serviceName}</p>
                            </div>
                            <button type='button' onClick={closeVehicleModal}>
                                Cerrar
                            </button>
                        </header>

                        <div className='vehicle-inspection-grid'>
                            <label>
                                Vehiculo
                                <select
                                    value={vehicleForm.vehicleId}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            vehicleId: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    {vehicleModal.vehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            {vehicle.name} - {vehicle.plate}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Kilometraje
                                <input
                                    type='number'
                                    value={vehicleForm.odometerKm}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            odometerKm: e.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                Nivel combustible
                                <select
                                    value={vehicleForm.fuelLevel}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            fuelLevel: e.target.value,
                                        })
                                    }
                                >
                                    <option value=''>Selecciona</option>
                                    <option value='reserva'>Reserva</option>
                                    <option value='1/4'>1/4</option>
                                    <option value='1/2'>1/2</option>
                                    <option value='3/4'>3/4</option>
                                    <option value='lleno'>Lleno</option>
                                </select>
                            </label>
                            <label>
                                Limpieza
                                <select
                                    value={vehicleForm.cleanliness}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            cleanliness: e.target.value,
                                        })
                                    }
                                >
                                    <option value=''>Selecciona</option>
                                    <option value='correcta'>Correcta</option>
                                    <option value='mejorable'>Mejorable</option>
                                    <option value='mala'>Mala</option>
                                </select>
                            </label>
                            <label>
                                Litros repostados
                                <input
                                    type='number'
                                    step='0.01'
                                    value={vehicleForm.fuelLiters}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            fuelLiters: e.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                Importe repostaje
                                <input
                                    type='number'
                                    step='0.01'
                                    value={vehicleForm.fuelAmount}
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            fuelAmount: e.target.value,
                                        })
                                    }
                                />
                            </label>
                        </div>

                        <div className='vehicle-inspection-checklist'>
                            {vehicleChecklistItems.map(([key, label]) => (
                                <label key={key}>
                                    <input
                                        type='checkbox'
                                        checked={Boolean(
                                            vehicleForm.checklist[key]
                                        )}
                                        onChange={() =>
                                            toggleVehicleChecklist(key)
                                        }
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>

                        <label className='vehicle-inspection-wide'>
                            Observaciones / danos
                            <textarea
                                value={vehicleForm.damageNotes}
                                onChange={(e) =>
                                    setVehicleForm({
                                        ...vehicleForm,
                                        damageNotes: e.target.value,
                                    })
                                }
                                placeholder='Estado del vehiculo, limpieza, golpes, incidencias...'
                            />
                        </label>

                        <div className='vehicle-inspection-grid'>
                            <label>
                                Fotos del vehiculo
                                <input
                                    type='file'
                                    accept='image/*,.heic'
                                    multiple
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            photos: Array.from(
                                                e.target.files || []
                                            ),
                                        })
                                    }
                                />
                            </label>
                            <label>
                                Tickets gasolina/diesel
                                <input
                                    type='file'
                                    accept='image/*,.pdf,.heic'
                                    multiple
                                    onChange={(e) =>
                                        setVehicleForm({
                                            ...vehicleForm,
                                            tickets: Array.from(
                                                e.target.files || []
                                            ),
                                        })
                                    }
                                />
                            </label>
                        </div>

                        <div className='vehicle-inspection-footer'>
                            <button
                                type='submit'
                                className='vehicle-inspection-submit'
                                disabled={vehicleSubmitting}
                            >
                                {vehicleSubmitting
                                    ? 'Enviando parte...'
                                    : 'Enviar parte de vehiculo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default EmployeeServicesComponent;


