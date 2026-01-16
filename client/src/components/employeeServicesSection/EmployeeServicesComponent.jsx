import { useContext, useEffect, useMemo, useState } from 'react';
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
    const [loading, setLoading] = useState(false);

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
    };

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
                                        <h3>{service.name || service.type}</h3>
                                        <p>
                                            Cliente: {service.firstName}{' '}
                                            {service.lastName}
                                        </p>
                                        <p>Tipo: {service.type}</p>
                                        <p>
                                            Direccion: {service.address},{' '}
                                            {service.city}
                                        </p>
                                        <p>
                                            Fecha: {new Date(
                                                service.startDateTime
                                            ).toLocaleString()}
                                        </p>
                                        <p>Estado: {service.status}</p>
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
                                            className='employee-btn'
                                            onClick={() =>
                                                toggleChat(service.serviceId)
                                            }
                                        >
                                            {openChats[service.serviceId]
                                                ? 'Cerrar chat'
                                                : 'Chat'}
                                        </button>
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
