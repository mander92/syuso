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
    fetchEndShiftRecord,
} from '../../services/shiftRecordService.js';
import { createServiceNfcLog } from '../../services/nfcService.js';
import { getChatSocket } from '../../services/chatSocket.js';
import ServiceChat from '../serviceChat/ServiceChat.jsx';
import './EmployeeServicesComponent.css';

const getLocation = () =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalizacion no disponible'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve([position.coords.latitude, position.coords.longitude]);
            },
            () => reject(new Error('No se pudo obtener la ubicacion'))
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

    const [services, setServices] = useState([]);
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [openShifts, setOpenShifts] = useState({});
    const [reportByService, setReportByService] = useState({});
    const [openChats, setOpenChats] = useState({});
    const [readingNfc, setReadingNfc] = useState({});
    const [expandedAddress, setExpandedAddress] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const openChatsRef = useRef({});
    const scrollRestoreRef = useRef(0);
    const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
    const [loading, setLoading] = useState(false);
    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );

    useEffect(() => {
        const loadServices = async () => {
            if (!authToken) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (type) params.append('type', type);

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
    }, [authToken, status, type]);

    useEffect(() => {
        const loadOpenShifts = async () => {
            if (!authToken) return;

            try {
                const data = await fetchShiftRecordsEmployee('', authToken);
                const open = {};
                const reports = {};
                (data?.details || []).forEach((record) => {
                    if (!record.clockOut) {
                        open[record.serviceId] = record.id;
                        reports[record.serviceId] = record.reportId || null;
                    }
                });
                setOpenShifts(open);
                setReportByService(reports);
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
            [...new Set(services.map((item) => item.type))]
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

    const handleFinish = async (serviceId) => {
        try {
            const shiftId = openShifts[serviceId];
            if (!shiftId) {
                toast.error('No hay un turno abierto para este servicio');
                return;
            }
            const location = await getLocation();
            await fetchEndShiftRecord(
                authToken,
                shiftId,
                serviceId,
                user?.id,
                location,
                new Date().toISOString()
            );
            setOpenShifts((prev) => {
                const next = { ...prev };
                delete next[serviceId];
                return next;
            });
            setReportByService((prev) => {
                const next = { ...prev };
                delete next[serviceId];
                return next;
            });
            toast.success('Turno finalizado');
        } catch (error) {
            toast.error(error.message || 'No se pudo finalizar el servicio');
        }
    };

    const toggleChat = (serviceId) => {
        setOpenChats((prev) => ({
            ...prev,
            [serviceId]: !prev[serviceId],
        }));
        setUnreadCounts((prev) => ({
            ...prev,
            [serviceId]: 0,
        }));
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
        openChatsRef.current = openChats;
    }, [openChats]);

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
        if (!socket || !user) return;
        if (!services.length) return;

        const serviceIds = services
            .map((service) => service.serviceId)
            .filter(Boolean);

        serviceIds.forEach((serviceId) => {
            socket.emit('chat:join', { serviceId });
        });

        const handleMessage = (message) => {
            if (!message?.serviceId) return;
            if (message.userId === user.id) return;
            if (!serviceIds.includes(message.serviceId)) return;
            if (openChatsRef.current[message.serviceId]) return;

            setUnreadCounts((prev) => ({
                ...prev,
                [message.serviceId]: (prev[message.serviceId] || 0) + 1,
            }));
        };

        socket.on('chat:message', handleMessage);

        return () => {
            socket.off('chat:message', handleMessage);
            serviceIds.forEach((serviceId) => {
                socket.emit('chat:leave', { serviceId });
            });
        };
    }, [socket, services, user]);

    return (
        <section className='employee-services'>
            <div className='employee-services-header'>
                <div>
                    <h1>Servicios asignados</h1>
                    <p>Gestiona tus servicios y registra entradas y salidas.</p>
                </div>
                <form className='employee-services-filters'>
                    <div className='employee-services-filter'>
                        <label htmlFor='status'>Estado</label>
                        <select
                            id='status'
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value=''>Todos</option>
                            <option value='accepted'>Aceptado</option>
                            <option value='canceled'>Cancelado</option>
                            <option value='completed'>Completado</option>
                            <option value='confirmed'>Confirmado</option>
                            <option value='pending'>Pendiente</option>
                            <option value='rejected'>Rechazado</option>
                        </select>
                    </div>
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
                        const isOpen = Boolean(openShifts[service.serviceId]);
                        const hasReport = Boolean(
                            reportByService[service.serviceId]
                        );
                        return (
                            <li key={service.serviceId} className='employee-card'>
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
                                                        service.serviceId
                                                    )
                                                }
                                                aria-expanded={
                                                    expandedAddress[
                                                        service.serviceId
                                                    ]
                                                        ? 'true'
                                                        : 'false'
                                                }
                                            >
                                                {expandedAddress[
                                                    service.serviceId
                                                ]
                                                    ? '–'
                                                    : '+'}
                                            </button>
                                        </div>
                                        {expandedAddress[service.serviceId] && (
                                            <p>
                                                Direccion: {service.address},{' '}
                                                {service.city}
                                            </p>
                                        )}
                                    </div>
                                    <div className='employee-card-actions'>
                                        <button
                                            type='button'
                                            className='employee-btn employee-btn--start'
                                            onClick={() =>
                                                handleStart(service.serviceId)
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
                                                    handleEnd(service.serviceId)
                                                }
                                            >
                                                Parte de trabajo
                                            </button>
                                        ) : null}
                                        {isOpen ? (
                                            <button
                                                type='button'
                                                className='employee-btn employee-btn--finish'
                                                onClick={() =>
                                                    handleFinish(
                                                        service.serviceId
                                                    )
                                                }
                                                disabled={!hasReport}
                                            >
                                                Finalizar turno
                                            </button>
                                        ) : null}
                                        <button
                                            type='button'
                                            className='employee-btn employee-btn--chat'
                                            onClick={() =>
                                                toggleChat(service.serviceId)
                                            }
                                        >
                                            {openChats[service.serviceId]
                                                ? 'Cerrar chat'
                                                : 'Chat'}
                                            {unreadCounts[service.serviceId] ? (
                                                <span className='employee-chat-badge'>
                                                    {unreadCounts[
                                                        service.serviceId
                                                    ]}
                                                </span>
                                            ) : null}
                                        </button>
                                        {isOpen ? (
                                            <button
                                                type='button'
                                                className='employee-btn employee-btn--nfc'
                                                onClick={() =>
                                                    handleReadNfc(
                                                        service.serviceId
                                                    )
                                                }
                                                disabled={
                                                    readingNfc[
                                                        service.serviceId
                                                    ] || !nfcSupported
                                                }
                                            >
                                                {readingNfc[service.serviceId]
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
                                {openChats[service.serviceId] && (
                                    <ServiceChat
                                        serviceId={service.serviceId}
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
        </section>
    );
};

export default EmployeeServicesComponent;
