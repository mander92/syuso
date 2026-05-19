import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    approveShiftSwapRequest,
    createAdminShiftSwapRequest,
    confirmShiftSwapRequest,
    createShiftSwapRequest,
    fetchAdminShiftSwapRequests,
    fetchMyShiftSwapRequests,
    rejectCounterpartShiftSwapRequest,
    rejectShiftSwapRequest,
} from '../../services/shiftSwapService.js';
import {
    fetchAllServicesServices,
    fetchDetailServiceServices,
    fetchEmployeeAllServicesServices,
    fetchServiceScheduleShifts,
} from '../../services/serviceService.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';
import './ShiftSwapsComponent.css';

const statusLabels = {
    pending: 'Pendiente',
    pending_counterpart: 'Pendiente del compañero',
    pending_admin: 'Pendiente de aprobación',
    approved: 'Aprobada',
    rejected: 'Rechazada',
};

const requestTypeLabels = {
    swap: 'Cambiar turnos',
    transfer: 'Ceder turnos',
    request: 'Pedir turnos',
};

const normalizeServices = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.data)) return data.data.data;
    return [];
};

const pageSizeOptions = [10, 20, 50];
const getDateKey = (value) => (value ? String(value).slice(0, 10) : '');

const ShiftSwapsComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const userRole = String(user?.role || '').trim().toLowerCase();
    const isAdminLike = userRole === 'admin' || userRole === 'sudo';
    const isEmployee = userRole === 'employee' || userRole === 'empleado';

    const [myRequests, setMyRequests] = useState([]);
    const [adminRequests, setAdminRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [serviceEmployees, setServiceEmployees] = useState([]);
    const [month, setMonth] = useState(
        () => new Date().toISOString().slice(0, 7)
    );
    const [formServiceId, setFormServiceId] = useState('');
    const [form, setForm] = useState({
        requestType: 'swap',
        requestorId: '',
        fromShiftIds: [],
        toShiftIds: [],
        counterpartId: '',
        reason: '',
    });
    const [coworkerSearch, setCoworkerSearch] = useState('');
    const [myShifts, setMyShifts] = useState([]);
    const [serviceShifts, setServiceShifts] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadingAdmin, setLoadingAdmin] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [creating, setCreating] = useState(false);
    const [actioningId, setActioningId] = useState('');
    const [rejectNotes, setRejectNotes] = useState({});
    const [filters, setFilters] = useState({
        employeeId: '',
        serviceId: '',
        requestType: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [myPage, setMyPage] = useState(1);
    const [adminPage, setAdminPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const serviceNameMap = useMemo(() => {
        const map = new Map();
        services.forEach((svc) => {
            const id = svc.serviceId || svc.id;
            if (!id || map.has(id)) return;
            const name =
                svc.name ||
                svc.type ||
                svc.serviceName ||
                svc.typeOfService ||
                'Servicio';
            map.set(id, name);
        });
        return map;
    }, [services]);

    const employeeNameMap = useMemo(() => {
        const map = new Map();
        employees.forEach((emp) => {
            const label = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
            map.set(emp.id, label || emp.email || 'Empleado');
        });
        serviceShifts.forEach((shift) => {
            if (!shift.employeeId || map.has(shift.employeeId)) return;
            const label = `${shift.firstName || ''} ${
                shift.lastName || ''
            }`.trim();
            map.set(shift.employeeId, label || 'Empleado');
        });
        serviceEmployees.forEach((employee) => {
            if (!employee.id || map.has(employee.id)) return;
            const label = `${employee.firstName || ''} ${
                employee.lastName || ''
            }`.trim();
            map.set(employee.id, label || employee.email || 'Empleado');
        });
        return map;
    }, [employees, serviceEmployees, serviceShifts]);

    const shiftMap = useMemo(() => {
        const map = new Map();
        myShifts.forEach((shift) => {
            if (shift?.id) map.set(shift.id, shift);
        });
        serviceShifts.forEach((shift) => {
            if (shift?.id && !map.has(shift.id)) {
                map.set(shift.id, shift);
            }
        });
        return map;
    }, [myShifts, serviceShifts]);

    const normalizeSearch = (value) =>
        String(value || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

    const getRequestPersonLabel = (request, kind) => {
        const name =
            kind === 'requestor'
                ? request.requestorName || request.requestorEmail
                : request.counterpartName || request.counterpartEmail;
        const id =
            kind === 'requestor' ? request.requestorId : request.counterpartId;
        return (
            String(name || '').trim() ||
            employeeNameMap.get(id) ||
            ''
        );
    };

    const getShiftEmployeeName = (shift) => {
        if (!shift?.employeeId) return 'Empleado';
        const fromMap = employeeNameMap.get(shift.employeeId);
        if (fromMap) return fromMap;
        const label = `${shift.firstName || ''} ${shift.lastName || ''}`.trim();
        return label || 'Empleado';
    };

    const coworkerShiftOptions = useMemo(() => {
        const search = normalizeSearch(coworkerSearch);
        const requestorId = isAdminLike ? form.requestorId : user?.id;
        const selectedEmployeeIds = new Set(
            serviceEmployees
                .filter((employee) => employee.id && employee.id !== requestorId)
                .filter((employee) => {
                    if (!search) return true;
                    return normalizeSearch(
                        `${employee.firstName || ''} ${
                            employee.lastName || ''
                        }`.trim() ||
                            employee.email ||
                            ''
                    ).includes(search);
                })
                .map((employee) => employee.id)
        );

        return serviceShifts
            .filter(
                (shift) =>
                    shift.employeeId &&
                    shift.employeeId !== requestorId &&
                    (!selectedEmployeeIds.size ||
                        selectedEmployeeIds.has(shift.employeeId))
            )
            .filter((shift) => {
                if (!search || selectedEmployeeIds.has(shift.employeeId)) {
                    return true;
                }
                return normalizeSearch(getShiftEmployeeName(shift)).includes(
                    search
                );
            })
            .slice(0, 12);
    }, [
        coworkerSearch,
        employeeNameMap,
        form.requestorId,
        isAdminLike,
        serviceEmployees,
        serviceShifts,
        user?.id,
    ]);

    const coworkerSearchMatches = useMemo(() => {
        const search = normalizeSearch(coworkerSearch);
        const requestorId = isAdminLike ? form.requestorId : user?.id;
        if (!search) {
            return serviceEmployees.filter(
                (employee) => employee.id && employee.id !== requestorId
            );
        }

        return serviceEmployees
            .filter((employee) => employee.id && employee.id !== requestorId)
            .filter((employee) =>
                normalizeSearch(
                    `${employee.firstName || ''} ${
                        employee.lastName || ''
                    }`.trim() ||
                        employee.email ||
                        ''
                ).includes(search)
            );
    }, [coworkerSearch, form.requestorId, isAdminLike, serviceEmployees, user?.id]);

    const coworkerResultGroups = useMemo(() => {
        return coworkerSearchMatches.slice(0, 12).map((employee) => ({
            employee,
            shifts: coworkerShiftOptions.filter(
                (shift) => shift.employeeId === employee.id
            ),
        }));
    }, [coworkerSearchMatches, coworkerShiftOptions]);

    useEffect(() => {
        if (!authToken || !user) return;

        const loadServices = async () => {
            try {
                if (isAdminLike) {
                    const data = await fetchAllServicesServices('', authToken);
                    setServices(normalizeServices(data));
                    return;
                }

                if (isEmployee) {
                    const data = await fetchEmployeeAllServicesServices(
                        '',
                        authToken
                    );
                    setServices(normalizeServices(data));
                    return;
                }

                setServices([]);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar los servicios disponibles'
                );
            }
        };

        loadServices();
    }, [authToken, user, isAdminLike, isEmployee]);

    useEffect(() => {
        if (!authToken) return;

        const loadMy = async () => {
            try {
                setLoadingRequests(true);
                const data = await fetchMyShiftSwapRequests(authToken);
                setMyRequests(Array.isArray(data) ? data : data?.data || []);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar tus solicitudes de cambio'
                );
            } finally {
                setLoadingRequests(false);
            }
        };

        const loadAdmin = async () => {
            if (!isAdminLike) return;
            try {
                setLoadingAdmin(true);
                const data = await fetchAdminShiftSwapRequests(authToken);
                setAdminRequests(Array.isArray(data) ? data : data?.data || []);
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar las solicitudes para aprobar'
                );
            } finally {
                setLoadingAdmin(false);
            }
        };

        loadMy();
        loadAdmin();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        if (!authToken || !isAdminLike) return;

        const loadEmployees = async () => {
            try {
                const params = new URLSearchParams({ role: 'employee' });
                const data = await fetchAllUsersServices(
                    params.toString(),
                    authToken
                );
                const list = Array.isArray(data)
                    ? data
                    : data?.users || data?.data || [];
                setEmployees(list);
            } catch {
                setEmployees([]);
            }
        };

        loadEmployees();
    }, [authToken, isAdminLike]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            requestorId: '',
            fromShiftIds: [],
            toShiftIds: [],
            counterpartId: '',
        }));
        setCoworkerSearch('');
        setMyShifts([]);
        setServiceShifts([]);
        setServiceEmployees([]);
        if (!authToken || !formServiceId) return;

        const loadShifts = async () => {
            try {
                setLoadingShifts(true);
                const [team, serviceDetail] = await Promise.all([
                    fetchServiceScheduleShifts(authToken, formServiceId, month),
                    fetchDetailServiceServices(formServiceId, authToken),
                ]);

                setServiceShifts(Array.isArray(team) ? team : []);
                setMyShifts(
                    Array.isArray(team)
                        ? team.filter(
                              (shift) =>
                                  shift.employeeId ===
                                  (isAdminLike ? form.requestorId : user?.id)
                          )
                        : []
                );
                setServiceEmployees(
                    Array.isArray(serviceDetail)
                        ? serviceDetail
                              .filter((row) => row?.employeeId)
                              .map((row) => ({
                                  id: row.employeeId,
                                  firstName: row.firstName,
                                  lastName: row.lastName,
                                  email: row.email,
                              }))
                              .filter(
                                  (employee, index, list) =>
                                      list.findIndex(
                                          (item) => item.id === employee.id
                                      ) === index
                              )
                        : []
                );
            } catch (error) {
                toast.error(
                    error.message ||
                        'No se pudieron cargar los turnos del servicio'
                );
            } finally {
                setLoadingShifts(false);
            }
        };

        loadShifts();
    }, [authToken, formServiceId, isAdminLike, month, user?.id]);

    useEffect(() => {
        const requestorId = isAdminLike ? form.requestorId : user?.id;
        setMyShifts(
            serviceShifts.filter((shift) => shift.employeeId === requestorId)
        );
    }, [form.requestorId, isAdminLike, serviceShifts, user?.id]);

    const formatShift = (shift) => {
        if (!shift) return '';
        const rawDate = shift.scheduleDate || shift.startDateTime || '';
        const date = rawDate
            ? new Intl.DateTimeFormat('es-ES', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
              }).format(new Date(rawDate))
            : 'Sin fecha';
        const start =
            shift.startTime?.slice(0, 5) || shift.startDateTime?.slice(11, 16);
        const end =
            shift.endTime?.slice(0, 5) || shift.endDateTime?.slice(11, 16);
        const type = shift.shiftTypeName || '';
        const details = [`${date}`, `${start || '?'} - ${end || '?'}`];
        if (type) details.push(type);
        return details.join(' | ');
    };

    const describeShift = (shiftId) => {
        if (!shiftId) return '—';
        const info = shiftMap.get(shiftId);
        if (info) return formatShift(info);
        return `ID ${shiftId.slice(0, 8)}…`;
    };

    const getRequestShiftIds = (request, field, fallbackField) => {
        const value = request[field];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string' && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch {
                return request[fallbackField] ? [request[fallbackField]] : [];
            }
        }
        return request[fallbackField] ? [request[fallbackField]] : [];
    };

    const getShiftDescriptions = (request, field, fallbackField) => {
        const summaryField =
            field === 'fromShiftIds' ? 'fromShiftSummary' : 'toShiftSummary';
        const summary = request[summaryField];
        if (summary) {
            return String(summary)
                .split(' / ')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        const ids = getRequestShiftIds(request, field, fallbackField);
        return ids.map((id) => describeShift(id)).filter(Boolean);
    };

    const renderShiftBoxes = (label, shifts) => (
        <div className='shift-swaps-turns'>
            <strong>{label}</strong>
            {shifts.length ? (
                <div className='shift-swaps-turns__list'>
                    {shifts.map((shift, index) => (
                        <span
                            className='shift-swaps-turn'
                            key={`${label}-${shift}-${index}`}
                        >
                            {shift}
                        </span>
                    ))}
                </div>
            ) : (
                <p>No aplica</p>
            )}
        </div>
    );

    const renderRequestShifts = (request) => {
        const requestType = request.requestType || 'swap';
        const fromShifts = getShiftDescriptions(
            request,
            'fromShiftIds',
            'fromShiftId'
        );
        const toShifts = getShiftDescriptions(
            request,
            'toShiftIds',
            'toShiftId'
        );

        if (requestType === 'transfer') {
            return renderShiftBoxes('Turno/s a ceder', fromShifts);
        }

        if (requestType === 'request') {
            return renderShiftBoxes('Turno/s solicitados', toShifts);
        }

        return (
            <>
                {renderShiftBoxes('Turno/s del solicitante', fromShifts)}
                {renderShiftBoxes('Turno/s del compañero', toShifts)}
            </>
        );
    };

    const describeRequestPerson = (request, kind) => {
        const name =
            kind === 'requestor'
                ? request.requestorName || request.requestorEmail
                : request.counterpartName || request.counterpartEmail;
        const id =
            kind === 'requestor' ? request.requestorId : request.counterpartId;
        const cleanName = getRequestPersonLabel(request, kind);
        const suffix = id === user?.id ? ' (Tú)' : '';
        return `${cleanName || describeUser(id)}${suffix}`;
    };

    const describeRequestService = (request) =>
        request.serviceName || serviceNameMap.get(request.serviceId) || request.serviceId;

    const describeUser = (userId) => {
        if (!userId) return '—';
        if (userId === user?.id) return 'Tú';
        return employeeNameMap.get(userId) || `ID ${userId.slice(0, 8)}…`;
    };

    const allRequestRows = useMemo(
        () =>
            [...myRequests, ...adminRequests].filter(
                (request, index, list) =>
                    request?.id &&
                    list.findIndex((item) => item?.id === request.id) === index
            ),
        [adminRequests, myRequests]
    );

    const requestEmployeeOptions = useMemo(() => {
        const map = new Map();
        allRequestRows.forEach((request) => {
            [
                ['requestor', request.requestorId],
                ['counterpart', request.counterpartId],
            ].forEach(([kind, id]) => {
                if (!id || map.has(id)) return;
                map.set(id, getRequestPersonLabel(request, kind) || describeUser(id));
            });
        });
        return [...map.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''), 'es', {
                    sensitivity: 'base',
                })
            );
    }, [allRequestRows, employeeNameMap, user?.id]);

    const requestServiceOptions = useMemo(() => {
        const map = new Map();
        allRequestRows.forEach((request) => {
            if (!request.serviceId || map.has(request.serviceId)) return;
            map.set(request.serviceId, describeRequestService(request));
        });
        return [...map.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''), 'es', {
                    sensitivity: 'base',
                })
            );
    }, [allRequestRows, serviceNameMap]);

    const filterRequests = (rows) => {
        const query = normalizeSearch(filters.search);
        return rows.filter((request) => {
            if (filters.employeeId) {
                const matchesEmployee =
                    request.requestorId === filters.employeeId ||
                    request.counterpartId === filters.employeeId;
                if (!matchesEmployee) return false;
            }
            if (filters.serviceId && request.serviceId !== filters.serviceId) {
                return false;
            }
            if (
                filters.requestType &&
                request.requestType !== filters.requestType
            ) {
                return false;
            }
            if (filters.status && request.status !== filters.status) {
                return false;
            }

            const createdDate = getDateKey(request.createdAt);
            if (filters.dateFrom && createdDate < filters.dateFrom) return false;
            if (filters.dateTo && createdDate > filters.dateTo) return false;

            if (!query) return true;
            return normalizeSearch(
                [
                    describeRequestService(request),
                    getRequestPersonLabel(request, 'requestor'),
                    getRequestPersonLabel(request, 'counterpart'),
                    requestTypeLabels[request.requestType || 'swap'],
                    request.requestType,
                    statusLabels[request.status],
                    request.status,
                    request.reason,
                    getShiftDescriptions(request, 'fromShiftIds', 'fromShiftId').join(' '),
                    getShiftDescriptions(request, 'toShiftIds', 'toShiftId').join(' '),
                ].join(' ')
            ).includes(query);
        });
    };

    const filteredMyRequests = useMemo(
        () => filterRequests(myRequests),
        [filters, myRequests, serviceNameMap, employeeNameMap, shiftMap]
    );

    const filteredAdminRequests = useMemo(
        () => filterRequests(adminRequests),
        [filters, adminRequests, serviceNameMap, employeeNameMap, shiftMap]
    );

    const getPaginated = (rows, page) => {
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        const safePage = Math.min(page, totalPages);
        const items = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
        return {
            items,
            totalPages,
            safePage,
            firstVisible: rows.length ? (safePage - 1) * pageSize + 1 : 0,
            lastVisible: Math.min(safePage * pageSize, rows.length),
        };
    };

    const myPagination = getPaginated(filteredMyRequests, myPage);
    const adminPagination = getPaginated(filteredAdminRequests, adminPage);
    const filteredTotal = isAdminLike
        ? filteredAdminRequests.length
        : filteredMyRequests.length;
    const pendingFilteredCount = (isAdminLike
        ? filteredAdminRequests
        : filteredMyRequests
    ).filter((request) =>
        ['pending', 'pending_admin', 'pending_counterpart'].includes(
            request.status
        )
    ).length;

    useEffect(() => {
        setMyPage(1);
        setAdminPage(1);
    }, [filters, pageSize]);

    useEffect(() => {
        if (myPage > myPagination.totalPages) setMyPage(myPagination.totalPages);
        if (adminPage > adminPagination.totalPages) {
            setAdminPage(adminPagination.totalPages);
        }
    }, [
        adminPage,
        adminPagination.totalPages,
        myPage,
        myPagination.totalPages,
    ]);

    const updateFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            employeeId: '',
            serviceId: '',
            requestType: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            search: '',
        });
    };

    const renderPagination = (rows, pagination, pageSetter) => {
        if (!rows.length) return null;
        return (
            <div className='shift-swaps-pagination'>
                <span>
                    Mostrando {pagination.firstVisible}-{pagination.lastVisible}{' '}
                    de {rows.length}
                </span>
                <label>
                    Por pagina
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            setPageSize(Number(event.target.value))
                        }
                    >
                        {pageSizeOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
                <div className='shift-swaps-pagination__actions'>
                    <button
                        type='button'
                        onClick={() =>
                            pageSetter((current) => Math.max(1, current - 1))
                        }
                        disabled={pagination.safePage <= 1}
                    >
                        Anterior
                    </button>
                    <strong>
                        {pagination.safePage} / {pagination.totalPages}
                    </strong>
                    <button
                        type='button'
                        onClick={() =>
                            pageSetter((current) =>
                                Math.min(pagination.totalPages, current + 1)
                            )
                        }
                        disabled={pagination.safePage >= pagination.totalPages}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        );
    };

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleShiftId = (field, shiftId) => {
        setForm((prev) => ({
            ...prev,
            [field]: prev[field].includes(shiftId)
                ? prev[field].filter((id) => id !== shiftId)
                : [...prev[field], shiftId],
        }));
    };

    const handleRequestTypeChange = (requestType) => {
        setForm((prev) => ({
            ...prev,
            requestType,
            fromShiftIds: [],
            toShiftIds: [],
            counterpartId: '',
        }));
        setCoworkerSearch('');
    };

    const handleRequestorSelect = (requestorId) => {
        setForm((prev) => ({
            ...prev,
            requestorId,
            fromShiftIds: [],
            toShiftIds: [],
            counterpartId: '',
        }));
        setCoworkerSearch('');
    };

    const handleCounterpartSelect = (employeeId) => {
        setForm((prev) => ({
            ...prev,
            counterpartId: employeeId,
            toShiftIds:
                prev.counterpartId && prev.counterpartId !== employeeId
                    ? []
                    : prev.toShiftIds,
        }));
        setCoworkerSearch(employeeNameMap.get(employeeId) || '');
    };

    const handleCoworkerShiftToggle = (shiftId) => {
        const targetShift = serviceShifts.find((shift) => shift.id === shiftId);
        if (!targetShift?.employeeId) return;
        setForm((prev) => {
            const isDifferentCounterpart =
                prev.counterpartId &&
                prev.counterpartId !== targetShift.employeeId;
            const currentIds = isDifferentCounterpart ? [] : prev.toShiftIds;
            return {
                ...prev,
                counterpartId: targetShift.employeeId,
                toShiftIds: currentIds.includes(shiftId)
                    ? currentIds.filter((id) => id !== shiftId)
                    : [...currentIds, shiftId],
            };
        });
        if (targetShift) {
            setCoworkerSearch(getShiftEmployeeName(targetShift));
        }
    };

    const clearCoworkerShift = () => {
        setForm((prev) => ({
            ...prev,
            toShiftIds: [],
            counterpartId: '',
        }));
        setCoworkerSearch('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!authToken) return;

        const payload = {
            serviceId: formServiceId,
            requestType: form.requestType,
            ...(isAdminLike ? { requestorId: form.requestorId } : {}),
            fromShiftIds:
                form.requestType === 'request' ? [] : form.fromShiftIds,
            toShiftIds:
                form.requestType === 'transfer' ? [] : form.toShiftIds,
            counterpartId: form.counterpartId,
            reason: form.reason.trim() || null,
        };

        const missing = Object.entries({
            serviceId: payload.serviceId,
            requestorId: isAdminLike ? payload.requestorId : true,
            fromShiftIds:
                payload.requestType === 'request'
                    ? true
                    : payload.fromShiftIds.length,
            toShiftIds:
                payload.requestType === 'transfer'
                    ? true
                    : payload.toShiftIds.length,
            counterpartId: payload.counterpartId,
        }).filter(([, value]) => !value);
        if (missing.length) {
            toast.error('Completa servicio, tus turnos y el del compañero.');
            return;
        }

        try {
            setCreating(true);
            await (isAdminLike
                ? createAdminShiftSwapRequest(authToken, payload)
                : createShiftSwapRequest(authToken, payload));
            toast.success('Solicitud enviada.');
            setForm((prev) => ({
                ...prev,
                requestorId: isAdminLike ? prev.requestorId : '',
                fromShiftIds: [],
                toShiftIds: [],
                counterpartId: '',
                reason: '',
            }));
            if (isAdminLike) {
                const admin = await fetchAdminShiftSwapRequests(authToken);
                setAdminRequests(Array.isArray(admin) ? admin : admin?.data || []);
            } else {
                const mine = await fetchMyShiftSwapRequests(authToken);
                setMyRequests(Array.isArray(mine) ? mine : mine?.data || []);
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo crear la solicitud');
        } finally {
            setCreating(false);
        }
    };

    const updateRequestLocal = (updated) => {
        const mergeRequest = (req) =>
            req.id === updated.id ? { ...req, ...updated } : req;

        setAdminRequests((prev) =>
            prev.map((req) => mergeRequest(req))
        );
        setMyRequests((prev) =>
            prev.map((req) => mergeRequest(req))
        );
    };

    const handleApprove = async (requestId) => {
        if (!authToken) return;
        try {
            setActioningId(requestId);
            const data = await approveShiftSwapRequest(authToken, requestId);
            toast.success('Solicitud aprobada.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo aprobar');
        } finally {
            setActioningId('');
        }
    };

    const handleReject = async (requestId) => {
        if (!authToken) return;
        const reason = rejectNotes[requestId] || '';
        try {
            setActioningId(requestId);
            const data = await rejectShiftSwapRequest(
                authToken,
                requestId,
                reason
            );
            toast.success('Solicitud rechazada.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo rechazar');
        } finally {
            setActioningId('');
        }
    };

    const handleCounterpartConfirm = async (requestId) => {
        if (!authToken) return;
        try {
            setActioningId(requestId);
            const data = await confirmShiftSwapRequest(authToken, requestId);
            toast.success('Solicitud confirmada. Queda pendiente de aprobación.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo confirmar');
        } finally {
            setActioningId('');
        }
    };

    const handleCounterpartReject = async (requestId) => {
        if (!authToken) return;
        const reason = rejectNotes[requestId] || '';
        try {
            setActioningId(requestId);
            const data = await rejectCounterpartShiftSwapRequest(
                authToken,
                requestId,
                reason
            );
            toast.success('Solicitud rechazada.');
            updateRequestLocal(data?.data || data);
        } catch (error) {
            toast.error(error.message || 'No se pudo rechazar');
        } finally {
            setActioningId('');
        }
    };

    if (!user || (!isEmployee && !isAdminLike)) {
        return (
            <section className='shift-swaps'>
                <div className='shift-swaps-card'>
                    <h2>Cambios de turno</h2>
                    <p>
                        Esta funcionalidad está disponible solo para empleados
                        y administradores.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className='shift-swaps'>
            <header className='shift-swaps__header'>
                <div>
                    <p className='shift-swaps__eyebrow'>Operativa interna</p>
                    <h2>Cambios de turno</h2>
                    <p className='shift-swaps__subtitle'>
                        Solicita intercambios entre compañeros y gestiona las
                        aprobaciones desde un único panel.
                    </p>
                </div>
                <div className='shift-swaps__meta'>
                    <span className='shift-swaps__badge'>
                        {filteredTotal} filtradas
                    </span>
                    <span className='shift-swaps__badge'>
                        {pendingFilteredCount} pendientes
                    </span>
                    {isAdminLike ? (
                        <span className='shift-swaps__badge shift-swaps__badge--accent'>
                            {adminRequests.filter(
                                (req) =>
                                    req.status === 'pending_admin' ||
                                    req.status === 'pending'
                            ).length || 0}{' '}
                            pendientes
                        </span>
                    ) : null}
                </div>
            </header>

            <div className='shift-swaps-filters'>
                <label>
                    Empleado
                    <select
                        value={filters.employeeId}
                        onChange={(event) =>
                            updateFilter('employeeId', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {requestEmployeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Servicio
                    <select
                        value={filters.serviceId}
                        onChange={(event) =>
                            updateFilter('serviceId', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {requestServiceOptions.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Tipo
                    <select
                        value={filters.requestType}
                        onChange={(event) =>
                            updateFilter('requestType', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {Object.entries(requestTypeLabels).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            )
                        )}
                    </select>
                </label>
                <label>
                    Estado
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            updateFilter('status', event.target.value)
                        }
                    >
                        <option value=''>Todos</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Desde
                    <input
                        type='date'
                        value={filters.dateFrom}
                        onChange={(event) =>
                            updateFilter('dateFrom', event.target.value)
                        }
                    />
                </label>
                <label>
                    Hasta
                    <input
                        type='date'
                        value={filters.dateTo}
                        onChange={(event) =>
                            updateFilter('dateTo', event.target.value)
                        }
                    />
                </label>
                <label className='shift-swaps-filters__search'>
                    Buscar
                    <input
                        type='search'
                        value={filters.search}
                        onChange={(event) =>
                            updateFilter('search', event.target.value)
                        }
                        placeholder='Nombre, servicio, turno...'
                    />
                </label>
                <button
                    type='button'
                    className='shift-swaps-filter-clear'
                    onClick={clearFilters}
                >
                    Limpiar filtros
                </button>
            </div>

            <div className='shift-swaps__grid'>
                <form className='shift-swaps-card' onSubmit={handleSubmit}>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Nueva solicitud
                            </p>
                            <h3>Proponer intercambio</h3>
                        </div>
                        <div className='shift-swaps__month'>
                            <label htmlFor='shift-swaps-month'>Mes</label>
                            <input
                                id='shift-swaps-month'
                                type='month'
                                value={month}
                                onChange={(event) =>
                                    setMonth(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className='shift-swaps-form'>
                        <label className='shift-swaps-field'>
                            <span>Servicio</span>
                            <select
                                value={formServiceId}
                                onChange={(event) =>
                                    setFormServiceId(event.target.value)
                                }
                            >
                                <option value=''>Selecciona servicio</option>
                                {services.map((svc) => {
                                    const id = svc.serviceId || svc.id;
                                    return (
                                        <option value={id} key={id}>
                                            {serviceNameMap.get(id) || id}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        {isAdminLike ? (
                            <label className='shift-swaps-field'>
                                <span>Trabajador que solicita</span>
                                <select
                                    value={form.requestorId}
                                    onChange={(event) =>
                                        handleRequestorSelect(event.target.value)
                                    }
                                    disabled={!formServiceId || loadingShifts}
                                >
                                    <option value=''>Selecciona trabajador</option>
                                    {serviceEmployees.map((employee) => (
                                        <option
                                            value={employee.id}
                                            key={employee.id}
                                        >
                                            {employeeNameMap.get(employee.id) ||
                                                employee.email ||
                                                employee.id}
                                        </option>
                                    ))}
                                </select>
                                <small>
                                    Admin propone el cambio en nombre de este
                                    trabajador.
                                </small>
                            </label>
                        ) : null}

                        <label className='shift-swaps-field'>
                            <span>Operacion</span>
                            <select
                                value={form.requestType}
                                onChange={(event) =>
                                    handleRequestTypeChange(event.target.value)
                                }
                            >
                                <option value='swap'>Cambiar turnos</option>
                                <option value='transfer'>Ceder turnos</option>
                                <option value='request'>Pedir turnos</option>
                            </select>
                        </label>

                        {form.requestType !== 'request' ? (
                            <div className='shift-swaps-field'>
                                <span>
                                    {isAdminLike
                                        ? `Turnos de ${
                                              form.requestorId
                                                  ? describeUser(
                                                        form.requestorId
                                                    )
                                                  : 'trabajador'
                                          }`
                                        : 'Tus turnos'}
                                </span>
                                <div className='shift-swaps-check-list'>
                                    {loadingShifts ? (
                                        <p>Cargando turnos...</p>
                                    ) : isAdminLike && !form.requestorId ? (
                                        <p>
                                            Selecciona primero el trabajador.
                                        </p>
                                    ) : !myShifts.length ? (
                                        <p>
                                            No hay turnos para ese trabajador en
                                            este servicio y mes.
                                        </p>
                                    ) : (
                                        myShifts.map((shift) => (
                                            <label key={shift.id}>
                                                <input
                                                    type='checkbox'
                                                    checked={form.fromShiftIds.includes(
                                                        shift.id
                                                    )}
                                                    onChange={() =>
                                                        toggleShiftId(
                                                            'fromShiftIds',
                                                            shift.id
                                                        )
                                                    }
                                                />
                                                <span>{formatShift(shift)}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <small>
                                    Puedes seleccionar uno o varios turnos.
                                </small>
                            </div>
                        ) : null}

                        <div className='shift-swaps-field'>
                            <span>Turno del compañero</span>
                            <input
                                type='search'
                                placeholder='Escribe el nombre del compañero'
                                value={coworkerSearch}
                                onChange={(event) => {
                                    setCoworkerSearch(event.target.value);
                                    setForm((prev) => ({
                                        ...prev,
                                        toShiftIds: [],
                                        counterpartId: '',
                                    }));
                                }}
                                disabled={
                                    !formServiceId ||
                                    loadingShifts ||
                                    (isAdminLike && !form.requestorId)
                                }
                            />

                            {form.counterpartId ? (
                                <div className='shift-swaps-selected'>
                                    <span>
                                        {describeUser(form.counterpartId)} ·{' '}
                                        {form.toShiftIds.length
                                            ? `${form.toShiftIds.length} turno(s)`
                                            : ''}
                                    </span>
                                    <button
                                        type='button'
                                        onClick={clearCoworkerShift}
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            ) : null}

                            <div className='shift-swaps-search-results'>
                                {!formServiceId ? (
                                    <p>Selecciona un servicio primero.</p>
                                ) : loadingShifts ? (
                                    <p>Cargando turnos...</p>
                                ) : !serviceEmployees.length ? (
                                    <p>No hay compañeros asignados al servicio.</p>
                                ) : !coworkerResultGroups.length ? (
                                    <p>No hay compañeros con ese nombre.</p>
                                ) : (
                                    coworkerResultGroups.map(
                                        ({ employee, shifts }) => (
                                            <div
                                                className='shift-swaps-coworker'
                                                key={employee.id}
                                            >
                                                <strong>
                                                    {employeeNameMap.get(
                                                        employee.id
                                                    ) || 'Empleado'}
                                                </strong>
                                                {form.requestType ===
                                                'transfer' ? (
                                                    <button
                                                        type='button'
                                                        className={
                                                            form.counterpartId ===
                                                            employee.id
                                                                ? 'is-selected'
                                                                : ''
                                                        }
                                                        onClick={() =>
                                                            handleCounterpartSelect(
                                                                employee.id
                                                            )
                                                        }
                                                    >
                                                        Seleccionar compañero
                                                    </button>
                                                ) : null}
                                                {form.requestType !==
                                                    'transfer' &&
                                                shifts.length ? (
                                                    shifts.map((shift) => (
                                                        <button
                                                            type='button'
                                                            key={shift.id}
                                                            className={
                                                                form.toShiftIds.includes(
                                                                    shift.id
                                                                )
                                                                    ? 'is-selected'
                                                                    : ''
                                                            }
                                                            onClick={() =>
                                                                handleCoworkerShiftToggle(
                                                                    shift.id
                                                                )
                                                            }
                                                        >
                                                            <span>
                                                                {formatShift(
                                                                    shift
                                                                )}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : form.requestType !==
                                                  'transfer' ? (
                                                    <p>
                                                        Sin turnos en el mes
                                                        seleccionado.
                                                    </p>
                                                ) : null}
                                            </div>
                                        )
                                    )
                                )}
                            </div>

                            {serviceShifts.length ? (
                                <small>
                                    Escribe el nombre y selecciona uno de sus
                                    turnos del mes.
                                </small>
                            ) : (
                                <small>
                                    Los compañeros aparecen al seleccionar el
                                    servicio; para solicitar el cambio necesitan
                                    tener turnos en el mes.
                                </small>
                            )}
                        </div>

                        <label className='shift-swaps-field'>
                            <span>Motivo (opcional)</span>
                            <textarea
                                rows={3}
                                value={form.reason}
                                onChange={(event) =>
                                    handleFieldChange(
                                        'reason',
                                        event.target.value
                                    )
                                }
                                placeholder='Breve contexto para el responsable'
                            />
                        </label>
                    </div>

                    <div className='shift-swaps-actions'>
                        <button
                            type='submit'
                            className='shift-swaps-btn shift-swaps-btn--primary'
                            disabled={creating || loadingShifts}
                        >
                            {creating ? 'Enviando...' : 'Solicitar cambio'}
                        </button>
                    </div>
                </form>

                <div className='shift-swaps-card'>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Historial
                            </p>
                            <h3>Mis solicitudes</h3>
                        </div>
                    </div>

                    {loadingRequests ? (
                        <p className='shift-swaps-empty'>Cargando...</p>
                    ) : !filteredMyRequests.length ? (
                        <p className='shift-swaps-empty'>
                            Aún no has enviado solicitudes.
                        </p>
                    ) : (
                        <>
                            <ul className='shift-swaps-list'>
                            {myPagination.items.map((req) => (
                                <li
                                    key={req.id}
                                    className='shift-swaps-item'
                                >
                                    <div className='shift-swaps-item__head'>
                                        <div>
                                            <p className='shift-swaps-service'>
                                                {describeRequestService(req)}
                                            </p>
                                            <p className='shift-swaps-date'>
                                                {formatDateTimeMadrid(
                                                    req.createdAt
                                                )}
                                            </p>
                                        </div>
                                        <span
                                            className={`shift-swaps-status shift-swaps-status--${req.status}`}
                                        >
                                            {statusLabels[req.status] ||
                                                req.status}
                                        </span>
                                    </div>
                                    <div className='shift-swaps-item__body'>
                                        <p>
                                            <strong>Servicio:</strong>{' '}
                                            {describeRequestService(req)}
                                        </p>
                                        <p>
                                            <strong>Solicitante:</strong>{' '}
                                            {describeRequestPerson(
                                                req,
                                                'requestor'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Compañero:</strong>{' '}
                                            {describeRequestPerson(
                                                req,
                                                'counterpart'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Tipo:</strong>{' '}
                                            {requestTypeLabels[
                                                req.requestType || 'swap'
                                            ] || req.requestType}
                                        </p>
                                        {renderRequestShifts(req)}
                                        {req.reason ? (
                                            <p className='shift-swaps-reason'>
                                                {req.reason}
                                            </p>
                                        ) : null}
                                        {req.status === 'approved' ||
                                        req.status === 'rejected' ? (
                                            <p className='shift-swaps-resolution'>
                                                Resuelto el{' '}
                                                {formatDateTimeMadrid(
                                                    req.decidedAt
                                                ) || '—'}
                                            </p>
                                        ) : null}
                                        {req.status ===
                                            'pending_counterpart' &&
                                        req.counterpartId === user?.id ? (
                                            <div className='shift-swaps-admin'>
                                                <input
                                                    type='text'
                                                    placeholder='Motivo de rechazo (opcional)'
                                                    value={
                                                        rejectNotes[req.id] || ''
                                                    }
                                                    onChange={(event) =>
                                                        setRejectNotes(
                                                            (prev) => ({
                                                                ...prev,
                                                                [req.id]:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                />
                                                <div className='shift-swaps-admin__actions'>
                                                    <button
                                                        type='button'
                                                        className='shift-swaps-btn'
                                                        onClick={() =>
                                                            handleCounterpartReject(
                                                                req.id
                                                            )
                                                        }
                                                        disabled={
                                                            actioningId ===
                                                            req.id
                                                        }
                                                    >
                                                        Rechazar
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='shift-swaps-btn shift-swaps-btn--primary'
                                                        onClick={() =>
                                                            handleCounterpartConfirm(
                                                                req.id
                                                            )
                                                        }
                                                        disabled={
                                                            actioningId ===
                                                            req.id
                                                        }
                                                    >
                                                        Confirmar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                            </ul>
                            {renderPagination(
                                filteredMyRequests,
                                myPagination,
                                setMyPage
                            )}
                        </>
                    )}
                </div>
            </div>

            {isAdminLike ? (
                <div className='shift-swaps-card'>
                    <div className='shift-swaps-card__header'>
                        <div>
                            <p className='shift-swaps__eyebrow'>
                                Bandeja de aprobación
                            </p>
                            <h3>Solicitudes de empleados</h3>
                        </div>
                    </div>
                    {loadingAdmin ? (
                        <p className='shift-swaps-empty'>Cargando...</p>
                    ) : !filteredAdminRequests.length ? (
                        <p className='shift-swaps-empty'>
                            No hay solicitudes registradas.
                        </p>
                    ) : (
                        <>
                            <ul className='shift-swaps-list'>
                            {adminPagination.items.map((req) => (
                                <li
                                    key={req.id}
                                    className='shift-swaps-item'
                                >
                                    <div className='shift-swaps-item__head'>
                                        <div>
                                            <p className='shift-swaps-service'>
                                                {describeRequestService(req)}
                                            </p>
                                            <p className='shift-swaps-date'>
                                                {formatDateTimeMadrid(
                                                    req.createdAt
                                                )}
                                            </p>
                                            <p className='shift-swaps-meta'>
                                                Solicitante:{' '}
                                                {describeRequestPerson(
                                                    req,
                                                    'requestor'
                                                )}{' '}
                                                · Compañero:{' '}
                                                {describeRequestPerson(
                                                    req,
                                                    'counterpart'
                                                )}
                                            </p>
                                        </div>
                                        <span
                                            className={`shift-swaps-status shift-swaps-status--${req.status}`}
                                        >
                                            {statusLabels[req.status] ||
                                                req.status}
                                        </span>
                                    </div>
                                    <div className='shift-swaps-item__body'>
                                        <p>
                                            <strong>Servicio:</strong>{' '}
                                            {describeRequestService(req)}
                                        </p>
                                        <p>
                                            <strong>Solicitante:</strong>{' '}
                                            {describeRequestPerson(
                                                req,
                                                'requestor'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Compañero:</strong>{' '}
                                            {describeRequestPerson(
                                                req,
                                                'counterpart'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Tipo:</strong>{' '}
                                            {requestTypeLabels[
                                                req.requestType || 'swap'
                                            ] || req.requestType}
                                        </p>
                                        {renderRequestShifts(req)}
                                        {req.reason ? (
                                            <p className='shift-swaps-reason'>
                                                {req.reason}
                                            </p>
                                        ) : null}
                                    </div>
                                    {req.status === 'pending_admin' ||
                                    req.status === 'pending' ? (
                                        <div className='shift-swaps-admin'>
                                            <input
                                                type='text'
                                                placeholder='Motivo de rechazo (opcional)'
                                                value={rejectNotes[req.id] || ''}
                                                onChange={(event) =>
                                                    setRejectNotes(
                                                        (prev) => ({
                                                            ...prev,
                                                            [req.id]:
                                                                event.target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                            />
                                            <div className='shift-swaps-admin__actions'>
                                                <button
                                                    type='button'
                                                    className='shift-swaps-btn'
                                                    onClick={() =>
                                                        handleReject(req.id)
                                                    }
                                                    disabled={
                                                        actioningId === req.id
                                                    }
                                                >
                                                    {actioningId === req.id
                                                        ? 'Guardando...'
                                                        : 'Rechazar'}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='shift-swaps-btn shift-swaps-btn--primary'
                                                    onClick={() =>
                                                        handleApprove(req.id)
                                                    }
                                                    disabled={
                                                        actioningId === req.id
                                                    }
                                                >
                                                    {actioningId === req.id
                                                        ? 'Procesando...'
                                                        : 'Aprobar'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                            </ul>
                            {renderPagination(
                                filteredAdminRequests,
                                adminPagination,
                                setAdminPage
                            )}
                        </>
                    )}
                </div>
            ) : null}
        </section>
    );
};

export default ShiftSwapsComponent;
