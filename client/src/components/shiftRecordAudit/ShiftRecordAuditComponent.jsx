import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import { fetchShiftRecordAuditLogs } from '../../services/shiftRecordService.js';
import './ShiftRecordAuditComponent.css';

const actionOptions = [
    { value: '', label: 'Todas' },
    { value: 'clock_in', label: 'Entrada fichada' },
    { value: 'clock_out', label: 'Salida fichada' },
    { value: 'admin_create', label: 'Creacion admin' },
    { value: 'admin_edit', label: 'Edicion admin' },
    { value: 'admin_delete', label: 'Eliminacion admin' },
    { value: 'work_report_close', label: 'Cierre con parte' },
];

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatSnapshot = (value) => {
    if (!value) return '-';
    const entries = [
        ['Entrada', value.clockIn],
        ['Salida', value.clockOut],
        ['Entrada real', value.realClockIn],
        ['Salida real', value.realClockOut],
        ['Lat. entrada', value.latitudeIn],
        ['Lng. entrada', value.longitudeIn],
        ['Lat. salida', value.latitudeOut],
        ['Lng. salida', value.longitudeOut],
    ].filter(([, item]) => item !== undefined && item !== null && item !== '');

    if (!entries.length) return '-';
    return entries.map(([label, item]) => `${label}: ${item}`).join('\n');
};

const buildQuery = (filters, generateExcel = false) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    if (generateExcel) params.set('generateExcel', 'true');
    return params.toString();
};

const ShiftRecordAuditComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        action: '',
        employeeId: '',
        serviceId: '',
    });
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const auditSummary = useMemo(
        () => ({
            total: logs.length,
            adminChanges: logs.filter((log) =>
                ['admin_create', 'admin_edit', 'admin_delete'].includes(
                    log.action
                )
            ).length,
            workerClockEvents: logs.filter((log) =>
                ['clock_in', 'clock_out'].includes(log.action)
            ).length,
        }),
        [logs]
    );

    const loadLogs = async (generateExcel = false) => {
        if (!authToken) return;
        try {
            setIsLoading(true);
            const data = await fetchShiftRecordAuditLogs(
                buildQuery(filters, generateExcel),
                authToken
            );
            setLogs(data.logs || []);
            if (generateExcel && data.excelFilePath) {
                window.open(
                    `${import.meta.env.VITE_API_URL}${data.excelFilePath}`,
                    '_blank',
                    'noopener,noreferrer'
                );
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar la auditoria');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [authToken]);

    const handleFilterChange = (key) => (event) => {
        setFilters((prev) => ({ ...prev, [key]: event.target.value }));
    };

    return (
        <section className='shift-audit'>
            <header className='shift-audit__header'>
                <div>
                    <h2>Auditoria de fichajes</h2>
                    <p>
                        Trazabilidad de entradas, salidas, ajustes manuales y
                        eliminaciones.
                    </p>
                </div>
                <div className='shift-audit__header-actions'>
                    <button
                        type='button'
                        onClick={() => loadLogs()}
                        disabled={isLoading}
                    >
                        Actualizar
                    </button>
                    <button
                        type='button'
                        onClick={() => loadLogs(true)}
                        disabled={isLoading}
                    >
                        Descargar Excel
                    </button>
                </div>
            </header>

            <div className='shift-audit__filters'>
                <label>
                    Desde
                    <input
                        type='date'
                        value={filters.startDate}
                        onChange={handleFilterChange('startDate')}
                    />
                </label>
                <label>
                    Hasta
                    <input
                        type='date'
                        value={filters.endDate}
                        onChange={handleFilterChange('endDate')}
                    />
                </label>
                <label>
                    Accion
                    <select
                        value={filters.action}
                        onChange={handleFilterChange('action')}
                    >
                        {actionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    ID trabajador
                    <input
                        value={filters.employeeId}
                        onChange={handleFilterChange('employeeId')}
                        placeholder='Opcional'
                    />
                </label>
                <label>
                    ID servicio
                    <input
                        value={filters.serviceId}
                        onChange={handleFilterChange('serviceId')}
                        placeholder='Opcional'
                    />
                </label>
            </div>

            <div className='shift-audit__summary'>
                <article>
                    <span>Eventos</span>
                    <strong>{auditSummary.total}</strong>
                </article>
                <article>
                    <span>Fichajes trabajador</span>
                    <strong>{auditSummary.workerClockEvents}</strong>
                </article>
                <article>
                    <span>Ajustes admin</span>
                    <strong>{auditSummary.adminChanges}</strong>
                </article>
            </div>

            <section className='shift-audit__legal'>
                <h3>Informe legal operativo</h3>
                <p>
                    Este registro documenta el horario concreto de inicio y fin
                    de jornada, los ajustes posteriores y el usuario que realiza
                    cada actuacion. Debe conservarse durante cuatro anos y estar
                    disponible para trabajadores, representantes e Inspeccion de
                    Trabajo.
                </p>
                <p>
                    Base de tratamiento: obligacion legal de registro de jornada.
                    No requiere consentimiento del trabajador, pero si informar
                    de la existencia del sistema, finalidad, datos tratados,
                    conservacion, accesos y derechos.
                </p>
                <p>
                    Para expedientes sensibles, revisa que el informe exportado
                    incluya el periodo completo, los cambios manuales y una
                    explicacion documentada de cualquier correccion.
                </p>
            </section>

            <div className='shift-audit__table-wrap'>
                <table className='shift-audit__table'>
                    <thead>
                        <tr>
                            <th>Fecha auditoria</th>
                            <th>Accion</th>
                            <th>Trabajador</th>
                            <th>Servicio</th>
                            <th>Actor</th>
                            <th>IP</th>
                            <th>Hash</th>
                            <th>Antes</th>
                            <th>Despues</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td>{formatDate(log.createdAt)}</td>
                                <td>{log.actionLabel}</td>
                                <td>
                                    <strong>{log.employeeName || '-'}</strong>
                                    <span>{log.employeeEmail || ''}</span>
                                </td>
                                <td>
                                    <strong>{log.serviceName || '-'}</strong>
                                    <span>{log.serviceCity || ''}</span>
                                </td>
                                <td>
                                    <strong>{log.actorName || '-'}</strong>
                                    <span>{log.actorRole || ''}</span>
                                </td>
                                <td>{log.requestIp || '-'}</td>
                                <td>
                                    <code>
                                        {log.rowHash
                                            ? log.rowHash.slice(0, 16)
                                            : '-'}
                                    </code>
                                </td>
                                <td>
                                    <pre>{formatSnapshot(log.oldValue)}</pre>
                                </td>
                                <td>
                                    <pre>{formatSnapshot(log.newValue)}</pre>
                                </td>
                            </tr>
                        ))}
                        {!logs.length ? (
                            <tr>
                                <td colSpan='9'>
                                    {isLoading
                                        ? 'Cargando auditoria...'
                                        : 'Sin registros de auditoria.'}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default ShiftRecordAuditComponent;
