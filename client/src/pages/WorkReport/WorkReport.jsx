import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchShiftRecordDetail,
    fetchCreateWorkReport,
    fetchWorkReportDraft,
    fetchSaveWorkReportDraft,
} from '../../services/shiftRecordService.js';
import { fetchDetailServiceServices } from '../../services/serviceService.js';
import './WorkReport.css';

const { VITE_API_URL } = import.meta.env;

const pad = (value) => String(value).padStart(2, '0');

const toLocalInputDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toLocalInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const nowDateTime = () => toLocalInputDateTime(new Date());

const toApiDateTime = (value) => {
    if (!value) return '';
    const parts = value.split('T');
    if (parts.length !== 2) return value;
    const time = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
    return `${parts[0]}T${time}`;
};

const calculateTotalHours = (startValue, endValue) => {
    if (!startValue || !endValue) return '';
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return '';
    }
    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
        const nextEnd = new Date(end);
        nextEnd.setDate(nextEnd.getDate() + 1);
        diffMs = nextEnd.getTime() - start.getTime();
    }
    if (diffMs < 0) return '';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
};

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

const WorkReport = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const navigate = useNavigate();
    const { shiftRecordId } = useParams();
    const [searchParams] = useSearchParams();
    const serviceIdParam = searchParams.get('serviceId');
    const [resolvedServiceId, setResolvedServiceId] = useState(serviceIdParam);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [serviceInfo, setServiceInfo] = useState(null);
    const [locationWarning, setLocationWarning] = useState('');

    const [formData, setFormData] = useState({
        folio: '',
        incidentStart: '',
        incidentEnd: '',
        totalHours: '',
        location: '',
        guardFullName: '',
        guardEmployeeNumber: '',
        securityCompany: 'Syuso',
        description: '',
    });
    const [incidents, setIncidents] = useState([
        { id: Date.now(), text: '', photoPaths: [], newPhotos: [] },
    ]);
    const [signatureData, setSignatureData] = useState('');
    const [draftReady, setDraftReady] = useState(false);
    const [draftSaving, setDraftSaving] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const isApplyingDraftRef = useRef(false);

    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const isDrawingRef = useRef(false);
    const [hasSignature, setHasSignature] = useState(false);
    const signatureDataRef = useRef('');

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
        const initCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ratio = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const width = rect.width || canvas.offsetWidth || 600;
            const height = rect.height || canvas.offsetHeight || 220;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#111';
            ctxRef.current = ctx;
            if (signatureDataRef.current) {
                const img = new Image();
                img.src = signatureDataRef.current;
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setHasSignature(true);
                };
            } else {
                setHasSignature(false);
            }
        };

        requestAnimationFrame(initCanvas);
        window.addEventListener('resize', initCanvas);
        return () => window.removeEventListener('resize', initCanvas);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!authToken || !shiftRecordId) return;
            try {
                const shiftDetail = await fetchShiftRecordDetail(
                    shiftRecordId,
                    authToken
                );
                const nextServiceId = serviceIdParam || shiftDetail?.serviceId;
                if (nextServiceId) {
                    setResolvedServiceId(nextServiceId);
                    const serviceDetail = await fetchDetailServiceServices(
                        nextServiceId,
                        authToken
                    );
                    setServiceInfo(serviceDetail);
                }

                setFormData((prev) => ({
                    ...prev,
                    incidentEnd: shiftDetail?.clockOut
                        ? toLocalInputDateTime(shiftDetail.clockOut)
                        : prev.incidentEnd,
                }));
            } catch (error) {
                toast.error(error.message || 'No se pudo cargar la informacion');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [authToken, shiftRecordId, serviceIdParam]);

    useEffect(() => {
        if (!user) return;
        setFormData((prev) => ({
            ...prev,
            guardFullName:
                prev.guardFullName ||
                `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            guardEmployeeNumber: prev.guardEmployeeNumber || '',
        }));
    }, [user]);

    useEffect(() => {
        const loadDraft = async () => {
            if (!authToken || !shiftRecordId) return;
            try {
                const draft = await fetchWorkReportDraft(
                    shiftRecordId,
                    authToken
                );
                if (!draft) {
                    setDraftReady(true);
                    return;
                }

                isApplyingDraftRef.current = true;

                if (draft.data) {
                    setFormData((prev) => ({
                        ...prev,
                        ...draft.data,
                    }));
                }

                if (Array.isArray(draft.data?.incidents)) {
                    setIncidents(
                        draft.data.incidents.map((incident) => ({
                            id: incident.id || Date.now() + Math.random(),
                            text: incident.text || '',
                            photoPaths: incident.photoPaths || [],
                            newPhotos: [],
                        }))
                    );
                }

                if (draft.signaturePath) {
                    const img = new Image();
                    img.src = `${VITE_API_URL}/uploads/${draft.signaturePath}`;
                    img.onload = () => {
                        const ctx = ctxRef.current;
                        const canvas = canvasRef.current;
                        if (!ctx || !canvas) return;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        setHasSignature(true);
                        const dataUrl = canvas.toDataURL('image/png');
                        signatureDataRef.current = dataUrl;
                        setSignatureData(dataUrl);
                    };
                }
            } catch (error) {
                toast.error(error.message || 'No se pudo cargar el borrador');
            } finally {
                setDraftReady(true);
                isApplyingDraftRef.current = false;
            }
        };

        loadDraft();
    }, [authToken, shiftRecordId]);

    const serviceTitle = useMemo(() => {
        if (!serviceInfo) return '';
        if (serviceInfo.name) return serviceInfo.name;
        return serviceInfo.type || '';
    }, [serviceInfo]);

    const minIncidentStart = useMemo(() => {
        if (!serviceInfo?.startDateTime) return '';
        return toLocalInputDateTime(serviceInfo.startDateTime);
    }, [serviceInfo]);

    const minIncidentEnd = useMemo(() => {
        if (formData.incidentStart) return formData.incidentStart;
        return minIncidentStart;
    }, [formData.incidentStart, minIncidentStart]);

    const computedTotalHours = useMemo(
        () =>
            calculateTotalHours(
                formData.incidentStart,
                formData.incidentEnd
            ),
        [formData.incidentStart, formData.incidentEnd]
    );

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            totalHours: computedTotalHours,
        }));
    }, [computedTotalHours]);

    useEffect(() => {
        if (!serviceInfo || !shiftRecordId) return;

        const startDate = serviceInfo.startDateTime
            ? new Date(serviceInfo.startDateTime)
            : null;
        const endDate = serviceInfo.endDateTime
            ? new Date(serviceInfo.endDateTime)
            : startDate && serviceInfo.hours
              ? new Date(
                    startDate.getTime() +
                        Number(serviceInfo.hours) * 60 * 60 * 1000
                )
              : null;
        const addressLine = serviceInfo.address
            ? `${serviceInfo.address}${serviceInfo.city ? `, ${serviceInfo.city}` : ''}`
            : '';
        const folio = shiftRecordId.slice(0, 8).toUpperCase();

        setFormData((prev) => ({
            ...prev,
            folio,
            incidentEnd: endDate
                ? toLocalInputDateTime(endDate)
                : prev.incidentEnd,
            totalHours: prev.totalHours || computedTotalHours,
            location: addressLine || prev.location,
        }));
    }, [serviceInfo, shiftRecordId, serviceTitle, computedTotalHours]);

    if (!authToken) return <Navigate to='/login' />;
    if (user && user.role !== 'employee') {
        return (
            <div className='work-report-page'>
                <div className='work-report-card'>
                    <h2>Acceso restringido</h2>
                    <p>Solo empleados pueden completar el parte de trabajo.</p>
                    <NavLink className='work-report-back' to='/account'>
                        Volver al panel
                    </NavLink>
                </div>
            </div>
        );
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'incidentStart' && minIncidentStart && value < minIncidentStart) {
            setFormData((prev) => ({ ...prev, incidentStart: minIncidentStart }));
            return;
        }
        if (name === 'incidentEnd' && minIncidentEnd && value < minIncidentEnd) {
            setFormData((prev) => ({ ...prev, incidentEnd: minIncidentEnd }));
            return;
        }
        if (name === 'incidentStart' || name === 'incidentEnd') {
            setFormData((prev) => {
                const next = { ...prev, [name]: value };
                return {
                    ...next,
                    totalHours: calculateTotalHours(
                        next.incidentStart,
                        next.incidentEnd
                    ),
                };
            });
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const getPoint = useCallback((event) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const source =
            event.touches?.[0] || event.changedTouches?.[0] || event;
        return {
            x: source.clientX - rect.left,
            y: source.clientY - rect.top,
        };
    }, []);

    const ensureContext = useCallback(() => {
        let ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return null;
        if (!ctx) {
            const ratio = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const width = rect.width || canvas.offsetWidth || 600;
            const height = rect.height || canvas.offsetHeight || 220;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            ctx = canvas.getContext('2d');
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#111';
            ctxRef.current = ctx;
        }
        return ctx;
    }, []);

    const drawLine = useCallback((event) => {
        if (!isDrawingRef.current) return;
        const ctx = ensureContext();
        if (!ctx) return;
        if (event.cancelable) {
            event.preventDefault();
        }
        const point = getPoint(event);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }, [ensureContext, getPoint]);

    const endDrawing = useCallback((event) => {
        const canvas = canvasRef.current;
        if (canvas?.releasePointerCapture && event?.pointerId != null) {
            canvas.releasePointerCapture(event.pointerId);
        }
        isDrawingRef.current = false;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            signatureDataRef.current = dataUrl;
            setSignatureData(dataUrl);
        }
    }, []);

    const startDrawing = useCallback((event) => {
        event.preventDefault();
        const ctx = ensureContext();
        const canvas = canvasRef.current;
        if (!ctx) return;
        if (canvas?.setPointerCapture && event.pointerId != null) {
            canvas.setPointerCapture(event.pointerId);
        }
        const point = getPoint(event);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        isDrawingRef.current = true;
        setHasSignature(true);
    }, [ensureContext, getPoint]);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setSignatureData('');
        signatureDataRef.current = '';
    };

    const addIncident = () => {
        setIncidents((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), text: '', photoPaths: [], newPhotos: [] },
        ]);
    };

    const updateIncident = (id, value) => {
        setIncidents((prev) =>
            prev.map((incident) =>
                incident.id === id ? { ...incident, text: value } : incident
            )
        );
    };

    const removeIncident = (id) => {
        setIncidents((prev) => {
            const next = prev.filter((incident) => incident.id !== id);
            if (!next.length) {
                return [
                    {
                        id: Date.now() + Math.random(),
                        text: '',
                        photoPaths: [],
                        newPhotos: [],
                    },
                ];
            }
            return next;
        });
    };

    const handleIncidentPhotosChange = (incidentId, files) => {
        const nextFiles = Array.from(files || []);
        setIncidents((prev) =>
            prev.map((incident) =>
                incident.id === incidentId
                    ? {
                          ...incident,
                          newPhotos: [...incident.newPhotos, ...nextFiles],
                      }
                    : incident
            )
        );
    };

    const saveDraft = useCallback(
        async () => {
            if (!authToken || !shiftRecordId || !resolvedServiceId) return;

            const cleanIncidents = incidents
                .filter(
                    (incident) =>
                        incident.text.trim() ||
                        incident.photoPaths?.length ||
                        incident.newPhotos?.length
                )
                .map((incident) => ({
                    id: incident.id,
                    text: incident.text.trim(),
                    photoPaths: incident.photoPaths || [],
                }));

            const formDataPayload = new FormData();
            formDataPayload.append('serviceId', resolvedServiceId);
            formDataPayload.append('folio', formData.folio.trim());
            formDataPayload.append(
                'incidentStart',
                toApiDateTime(formData.incidentStart || '')
            );
            formDataPayload.append(
                'incidentEnd',
                toApiDateTime(formData.incidentEnd || '')
            );
            formDataPayload.append('totalHours', computedTotalHours || '');
            formDataPayload.append('location', formData.location || '');
            formDataPayload.append(
                'guardFullName',
                formData.guardFullName || ''
            );
            formDataPayload.append(
                'guardEmployeeNumber',
                formData.guardEmployeeNumber || ''
            );
            formDataPayload.append(
                'securityCompany',
                formData.securityCompany || ''
            );
            formDataPayload.append('description', formData.description || '');
            if (signatureData) {
                formDataPayload.append('signature', signatureData);
            }
            if (cleanIncidents.length) {
                formDataPayload.append(
                    'incidents',
                    JSON.stringify(cleanIncidents)
                );
            }
            incidents.forEach((incident) => {
                if (!incident.newPhotos.length) return;
                incident.newPhotos.forEach((file) => {
                    formDataPayload.append(
                        `incidentPhotos_${incident.id}`,
                        file
                    );
                });
            });

            try {
                setDraftSaving(true);
                const data = await fetchSaveWorkReportDraft(
                    shiftRecordId,
                    authToken,
                    formDataPayload
                );
                if (Array.isArray(data?.incidents)) {
                    isApplyingDraftRef.current = true;
                    setIncidents((prev) =>
                        prev.map((incident) => {
                            const updated = data.incidents.find(
                                (item) => item.id === incident.id
                            );
                            if (!updated) {
                                return { ...incident, newPhotos: [] };
                            }
                            return {
                                ...incident,
                                photoPaths: updated.photoPaths || [],
                                newPhotos: [],
                            };
                        })
                    );
                }
                if (data?.signaturePath) {
                    setDraftSavedAt(new Date());
                }
                setDraftSavedAt(new Date());
            } catch (error) {
                toast.error(error.message || 'No se pudo guardar el borrador');
            } finally {
                setDraftSaving(false);
                isApplyingDraftRef.current = false;
            }
        },
        [
            authToken,
            shiftRecordId,
            resolvedServiceId,
            formData,
            incidents,
            signatureData,
        ]
    );

    const handleSaveDraft = () => {
        if (!draftReady || isApplyingDraftRef.current) return;
        saveDraft();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!resolvedServiceId) {
            toast.error('Servicio no encontrado para el turno');
            return;
        }

        const signaturePayload =
            signatureDataRef.current || signatureData || '';

        if (!hasSignature || !signaturePayload) {
            toast.error('La firma es obligatoria');
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            toast.error('No se pudo capturar la firma');
            return;
        }

        try {
            setSaving(true);
            let locationCoords;
            try {
                setLocationWarning('');
                locationCoords = await getLocation();
            } catch (error) {
                setLocationWarning(
                    'Activa la ubicacion del movil para poder enviar el parte.'
                );
                toast.error(
                    error.message || 'No se pudo obtener la ubicacion'
                );
                setSaving(false);
                return;
            }
            const cleanIncidents = incidents
                .filter(
                    (incident) =>
                        incident.text.trim() ||
                        incident.photoPaths?.length ||
                        incident.newPhotos?.length
                )
                .map((incident) => ({
                    id: incident.id,
                    text: incident.text.trim(),
                    photoPaths: incident.photoPaths || [],
                }));

            const formDataPayload = new FormData();
            formDataPayload.append('serviceId', resolvedServiceId);
            formDataPayload.append('folio', formData.folio.trim());
            formDataPayload.append(
                'incidentStart',
                toApiDateTime(formData.incidentStart)
            );
            formDataPayload.append(
                'incidentEnd',
                toApiDateTime(formData.incidentEnd)
            );
            formDataPayload.append(
                'totalHours',
                computedTotalHours || ''
            );
            formDataPayload.append('location', formData.location.trim());
            formDataPayload.append(
                'guardFullName',
                formData.guardFullName.trim()
            );
            formDataPayload.append(
                'guardEmployeeNumber',
                formData.guardEmployeeNumber.trim()
            );
            formDataPayload.append('guardShift', serviceTitle || 'Turno');
            formDataPayload.append(
                'securityCompany',
                formData.securityCompany.trim()
            );
            formDataPayload.append('incidentType', 'Parte de trabajo');
            formDataPayload.append('severity', 'leve');
            formDataPayload.append(
                'description',
                formData.description.trim()
            );
            formDataPayload.append('detection', 'No aplica');
            formDataPayload.append('actionsTaken', 'No aplica');
            formDataPayload.append('outcome', 'controlado');
            formDataPayload.append('signature', signaturePayload);
            formDataPayload.append(
                'locationCoords',
                JSON.stringify(locationCoords)
            );
            if (cleanIncidents.length) {
                formDataPayload.append(
                    'incidents',
                    JSON.stringify(cleanIncidents)
                );
            }
            incidents.forEach((incident) => {
                if (!incident.newPhotos.length) return;
                incident.newPhotos.forEach((file) => {
                    formDataPayload.append(
                        `incidentPhotos_${incident.id}`,
                        file
                    );
                });
            });

            await fetchCreateWorkReport(
                shiftRecordId,
                authToken,
                formDataPayload
            );
            toast.success('Parte enviado y turno finalizado');
            navigate('/account');
        } catch (error) {
            toast.error(error.message || 'No se pudo generar el parte');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='work-report-page'>
                <div className='work-report-card'>
                    <p>Cargando informacion...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='work-report-page'>
            <div className='work-report-header'>
                <div>
                    <h1>Parte de trabajo</h1>
                    <p>Completa el parte antes de cerrar el turno.</p>
                    {serviceTitle ? (
                        <p className='work-report-service'>Servicio: {serviceTitle}</p>
                    ) : null}
                    <p className='work-report-save'>
                        {draftSaving
                            ? 'Guardando borrador...'
                            : draftSavedAt
                              ? `Borrador guardado ${draftSavedAt.toLocaleTimeString()}`
                              : 'Borrador sin guardar'}
                    </p>
                </div>
                <NavLink className='work-report-back' to='/account'>
                    Volver al panel
                </NavLink>
            </div>

            {locationWarning && (
                <div className='work-report-location-warning'>
                    <span>{locationWarning}</span>
                    <button type='button' onClick={openLocationSettings}>
                        Activar ubicacion
                    </button>
                </div>
            )}

            <form className='work-report-card' onSubmit={handleSubmit}>
                <div className='work-report-section'>
                    <h2>Datos generales</h2>
                    <div className='work-report-grid'>
                        <label>
                            Numero de parte / folio
                            <input name='folio' value={formData.folio} readOnly />
                        </label>
                        <label>
                            Hora inicio
                            <input
                                type='datetime-local'
                                name='incidentStart'
                                value={formData.incidentStart}
                                onChange={handleChange}
                                min={minIncidentStart || undefined}
                                required
                            />
                        </label>
                        <label>
                            Hora fin
                            <input
                                type='datetime-local'
                                name='incidentEnd'
                                value={formData.incidentEnd}
                                onChange={handleChange}
                                min={minIncidentEnd || undefined}
                                required
                            />
                        </label>
                        <label>
                            Total de horas
                            <input
                                name='totalHours'
                                value={computedTotalHours}
                                readOnly
                            />
                        </label>
                        <label className='work-report-span'>
                            Lugar exacto (instalacion, area, direccion)
                            <input
                                name='location'
                                value={formData.location}
                                onChange={handleChange}
                                readOnly={Boolean(serviceInfo?.address)}
                                required
                            />
                        </label>
                    </div>
                </div>

                <div className='work-report-section'>
                    <h2>Datos del vigilante</h2>
                    <div className='work-report-grid'>
                        <label>
                            Nombre completo
                            <input
                                name='guardFullName'
                                value={formData.guardFullName}
                                readOnly
                            />
                        </label>
                        <label>
                            TIP
                            <input
                                name='guardEmployeeNumber'
                                value={formData.guardEmployeeNumber}
                                onChange={handleChange}
                                required
                            />
                        </label>
                        <label>
                            Empresa de seguridad
                            <input
                                name='securityCompany'
                                value={formData.securityCompany}
                                readOnly
                            />
                        </label>
                    </div>
                </div>

                <div className='work-report-section'>
                    <h2>Informe</h2>
                    <div className='work-report-grid'>
                        <label className='work-report-span'>
                            Informe del empleado
                            <textarea
                                name='description'
                                value={formData.description}
                                onChange={handleChange}
                                rows='6'
                                required
                            />
                        </label>
                    </div>
                </div>

                <div className='work-report-section'>
                    <h2>Incidencias</h2>
                    <div className='work-report-grid'>
                        {incidents.map((incident, index) => (
                            <label key={incident.id} className='work-report-span'>
                                Incidencia {index + 1}
                                <div className='work-report-incident'>
                                    <input
                                        value={incident.text}
                                        onChange={(event) =>
                                            updateIncident(
                                                incident.id,
                                                event.target.value
                                            )
                                        }
                                        placeholder='Describe la incidencia'
                                    />
                                    <button
                                        type='button'
                                        onClick={() =>
                                            removeIncident(incident.id)
                                        }
                                    >
                                        Quitar
                                    </button>
                                </div>
                                <div className='work-report-incident-photos'>
                                    <input
                                        id={`incident-photos-${incident.id}`}
                                        type='file'
                                        accept='image/*'
                                        multiple
                                        onChange={(event) =>
                                            handleIncidentPhotosChange(
                                                incident.id,
                                                event.target.files
                                            )
                                        }
                                        hidden
                                    />
                                    <button
                                        type='button'
                                        className='work-report-incident-add'
                                        onClick={() =>
                                            document
                                                .getElementById(
                                                    `incident-photos-${incident.id}`
                                                )
                                                ?.click()
                                        }
                                    >
                                        Anadir fotos
                                    </button>
                                    {incident.newPhotos.length ? (
                                        <div className='work-report-photo-list'>
                                            {incident.newPhotos.map((file) => (
                                                <div
                                                    key={`${incident.id}-${file.name}-${file.lastModified}`}
                                                    className='work-report-photo'
                                                >
                                                    <span>{file.name}</span>
                                                    <button
                                                        type='button'
                                                        onClick={() =>
                                                            setIncidents(
                                                                (prev) =>
                                                                    prev.map(
                                                                        (item) =>
                                                                            item.id ===
                                                                            incident.id
                                                                                ? {
                                                                                      ...item,
                                                                                      newPhotos:
                                                                                          item.newPhotos.filter(
                                                                                              (
                                                                                                  photo
                                                                                              ) =>
                                                                                                  photo !==
                                                                                                  file
                                                                                          ),
                                                                                  }
                                                                                : item
                                                                    )
                                                            )
                                                        }
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {incident.photoPaths.length ? (
                                        <div className='work-report-photos'>
                                            {incident.photoPaths.map(
                                                (photo, photoIndex) => (
                                                    <div
                                                        key={`${incident.id}-${photo}`}
                                                        className='work-report-photo'
                                                    >
                                                        <img
                                                            src={`${VITE_API_URL}/uploads/${photo}`}
                                                            alt={`Incidencia ${index + 1} foto ${photoIndex + 1}`}
                                                        />
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                setIncidents(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                item
                                                                            ) =>
                                                                                item.id ===
                                                                                incident.id
                                                                                    ? {
                                                                                          ...item,
                                                                                          photoPaths:
                                                                                              item.photoPaths.filter(
                                                                                                  (
                                                                                                      p
                                                                                                  ) =>
                                                                                                      p !==
                                                                                                      photo
                                                                                              ),
                                                                                      }
                                                                                    : item
                                                                        )
                                                                )
                                                            }
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </label>
                        ))}
                        <button
                            type='button'
                            className='work-report-add'
                            onClick={addIncident}
                        >
                            Anadir incidencia
                        </button>
                    </div>
                </div>


                <div className='work-report-section'>
                    <div className='work-report-signature'>
                        <div className='work-report-signature-header'>
                            <span>Firma del vigilante</span>
                            <button type='button' onClick={clearSignature}>
                                Limpiar firma
                            </button>
                        </div>
                        <canvas
                            ref={canvasRef}
                            className='work-report-canvas'
                            onPointerDown={startDrawing}
                            onPointerMove={drawLine}
                            onPointerUp={endDrawing}
                            onPointerLeave={endDrawing}
                            onMouseDown={startDrawing}
                            onMouseMove={drawLine}
                            onMouseUp={endDrawing}
                            onMouseLeave={endDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={drawLine}
                            onTouchEnd={endDrawing}
                            onTouchCancel={endDrawing}
                        />
                    </div>
                </div>

                <div className='work-report-actions'>
                    <button
                        type='button'
                        className='work-report-draft'
                        onClick={handleSaveDraft}
                        disabled={draftSaving}
                    >
                        {draftSaving ? 'Guardando...' : 'Guardar borrador'}
                    </button>
                    <button
                        type='submit'
                        className='work-report-submit'
                        disabled={saving}
                    >
                        {saving ? 'Enviando...' : 'Enviar parte'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WorkReport;
