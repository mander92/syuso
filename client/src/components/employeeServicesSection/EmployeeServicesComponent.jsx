import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEmployeeAllServicesServices,
} from '../../services/serviceService.js';
import {
    fetchShiftRecordsEmployee,
    fetchStartShiftRecord,
} from '../../services/shiftRecordService.js';
import { createServiceNfcLog } from '../../services/nfcService.js';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import ServiceChat from '../serviceChat/ServiceChat.jsx';
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
    const scrollRestoreRef = useRef(0);
    const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
    const [loading, setLoading] = useState(false);
    const { unreadByService } = useChatNotifications();

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

    return (
        <section className='employee-services'>
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
                                        {service.locationLink ? (
                                            <p>
                                                Ubicacion:{' '}
                                                <a
                                                    href={service.locationLink}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    Ver ubicacion
                                                </a>
                                            </p>
                                        ) : null}
                                        {expandedAddress[serviceId] &&
                                        !service.locationLink ? (
                                            <p>
                                                Direccion: {service.address},{' '}
                                                {service.city}
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
                                {service.scheduleImage && (
                                    <div className='employee-card-schedule'>
                                        <a
                                            href={`${import.meta.env.VITE_API_URL}/uploads/${service.scheduleImage}`}
                                            target='_blank'
                                            rel='noreferrer'
                                        >
                                            Ver cuadrante
                                        </a>
                                    </div>
                                )}
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
        </section>
    );
};

export default EmployeeServicesComponent;

