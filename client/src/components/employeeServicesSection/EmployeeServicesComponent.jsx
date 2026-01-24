import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEmployeeAllServicesServices,
    fetchEmployeeScheduleShifts,
} from '../../services/serviceService.js';
import {
    fetchShiftRecordsEmployee,
    fetchStartShiftRecord,
} from '../../services/shiftRecordService.js';
import { createServiceNfcLog } from '../../services/nfcService.js';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import ServiceChat from '../serviceChat/ServiceChat.jsx';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import './EmployeeServicesComponent.css';

const LOCATION_CACHE_KEY = 'syuso_last_location';

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
    const [openChats, setOpenChats] = useState({});
    const [readingNfc, setReadingNfc] = useState({});
    const [expandedAddress, setExpandedAddress] = useState({});
    const [locationWarning, setLocationWarning] = useState('');
    const scrollRestoreRef = useRef(0);
    const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
    const [loading, setLoading] = useState(false);
    const { unreadByService } = useChatNotifications();
    const [scheduleModal, setScheduleModal] = useState(null);
    const [scheduleMonth] = useState(() =>
        new Date().toISOString().slice(0, 7)
    );
    const [scheduleShifts, setScheduleShifts] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

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
        const loadOpenShifts = async () => {
            if (!authToken) return;

            try {
                const data = await fetchShiftRecordsEmployee('', authToken);
                const open = {};
                (data?.details || []).forEach((record) => {
                    if (!record.clockOut) {
                        open[record.serviceId] = record.id;
                    }
                });
                setOpenShifts(open);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los turnos'
                );
            }
        };

        loadOpenShifts();
    }, [authToken]);

    const uniqueTypes = useMemo(
        () =>
            [...new Set(services.map((item) => item.name))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
        [services]
    );

    const handleStart = async (serviceId) => {
        try {
            setLocationWarning('');
            const location = await getLocation();
            const shiftId = await fetchStartShiftRecord(
                authToken,
                serviceId,
                user?.id,
                location,
                new Date().toISOString()
            );
            setOpenShifts((prev) => ({ ...prev, [serviceId]: shiftId }));
            toast.success('Inicio de servicio registrado');
        } catch (error) {
            setLocationWarning(
                'Activa la ubicacion del movil para poder fichar.'
            );
            toast.error(error.message || 'No se pudo iniciar el servicio');
        }
    };

    const handleEnd = (serviceId) => {
        const shiftId = openShifts[serviceId];
        if (!shiftId) {
            toast.error('No hay un turno abierto para este servicio');
            return;
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
            if (!authToken || !scheduleModal?.serviceId || !user?.id) return;
            try {
                setScheduleLoading(true);
                const data = await fetchEmployeeScheduleShifts(
                    authToken,
                    scheduleMonth,
                    false,
                    scheduleModal.serviceId
                );
                const normalized = (Array.isArray(data) ? data : []).map(
                    (shift) => ({
                        ...shift,
                        employeeId: user.id,
                    })
                );
                setScheduleShifts(normalized);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudieron cargar los turnos'
                );
            } finally {
                setScheduleLoading(false);
            }
        };

        loadScheduleShifts();
    }, [authToken, scheduleModal, scheduleMonth, user?.id]);

    const scheduleEmployees = useMemo(() => {
        if (!user?.id) return [];
        return [
            {
                id: user.id,
                firstName: user.firstName || 'Empleado',
                lastName: user.lastName || '',
            },
        ];
    }, [user]);

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
                    {services.map((service) => {
                        const serviceId = service.serviceId || service.id;
                        if (!serviceId) return null;
                        const isOpen = Boolean(openShifts[serviceId]);
                        const hasNfc = Number(service.nfcCount || 0) > 0;
                        return (
                            <li key={serviceId} className='employee-card'>
                                <div className='employee-card-row'>
                                    <div>
                                        <div className='employee-card-title'>
                                            <h3>
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
                                                {expandedAddress[
                                                    serviceId
                                                ]
                                                    ? '–'
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
                                    </div>
                                    <div className='employee-card-actions'>
                                        <button
                                            type='button'
                                            className='employee-btn employee-btn--start'
                                            onClick={() =>
                                                handleStart(serviceId)
                                            }
                                            disabled={isOpen}
                                        >
                                            {isOpen ? 'En curso' : 'Iniciar'}
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
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {scheduleModal && (
                <div
                    className='employee-schedule-modal-overlay'
                    onClick={closeScheduleModal}
                >
                    <div
                        className='employee-schedule-modal'
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className='employee-schedule-modal-header'>
                            <div>
                                <h3>
                                    Cuadrante: {scheduleModal.serviceName}
                                </h3>
                                <p>{scheduleMonth}</p>
                            </div>
                            <button
                                type='button'
                                className='employee-schedule-modal-close'
                                onClick={closeScheduleModal}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='employee-schedule-modal-body'>
                            {scheduleModal.scheduleView === 'image' &&
                            scheduleModal.scheduleImage ? (
                                <div className='employee-schedule-image'>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL}/uploads/${scheduleModal.scheduleImage}`}
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        Ver cuadrante actual
                                    </a>
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
        </section>
    );
};

export default EmployeeServicesComponent;

