import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import { fetchTimeRecordReport } from '../../services/shiftRecordService.js';
import './TimeRecordReportComponent.css';

const { VITE_API_URL } = import.meta.env;

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const defaultSummary = {
    totalRows: 0,
    okRows: 0,
    issueRows: 0,
    absenceRows: 0,
    realHours: 0,
    plannedHours: 0,
};

const statusClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (
        ['correcto', 'registrado', 'vacaciones', 'libre', 'baja'].includes(
            normalized
        )
    ) {
        return 'time-record-status--ok';
    }
    if (normalized.includes('pendiente') || normalized.includes('sin fichaje')) {
        return 'time-record-status--warning';
    }
    return 'time-record-status--issue';
};

const buildQuery = (filters, exportType = '') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    if (exportType === 'excel') params.set('generateExcel', 'true');
    if (exportType === 'pdf') params.set('generatePdf', 'true');
    return params.toString();
};

const openGeneratedFile = (filePath) => {
    if (!filePath) return;
    window.open(`${VITE_API_URL}${filePath}`, '_blank', 'noopener,noreferrer');
};

const TimeRecordReportComponent = ({ mode = 'admin' }) => {
    const { authToken } = useContext(AuthContext);
    const isEmployeeMode = mode === 'employee';
    const [filters, setFilters] = useState({
        month: getCurrentMonth(),
        employeeId: '',
        serviceId: '',
        delegationId: '',
    });
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(defaultSummary);
    const [isLoading, setIsLoading] = useState(false);

    const loadReport = useCallback(
        async (exportType = '') => {
            if (!authToken) return;
            try {
                setIsLoading(true);
                const data = await fetchTimeRecordReport(
                    buildQuery(filters, exportType),
                    authToken
                );
                setRows(Array.isArray(data?.rows) ? data.rows : []);
                setSummary(data?.summary || defaultSummary);
                if (exportType === 'excel') {
                    openGeneratedFile(data?.excelFilePath);
                }
                if (exportType === 'pdf') {
                    openGeneratedFile(data?.pdfFilePath);
                }
            } catch (error) {
                toast.error(
                    error.message || 'No se pudo cargar el registro horario'
                );
            } finally {
                setIsLoading(false);
            }
        },
        [authToken, filters]
    );

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const issueRows = useMemo(
        () =>
            rows.filter(
                (row) =>
                    ![
                        'Correcto',
                        'Registrado',
                        'Vacaciones',
                        'Libre',
                        'Baja',
                        'Disponible',
                    ].includes(row.status)
            ),
        [rows]
    );

    const updateFilter = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    return (
        <section className='time-record-report'>
            <header className='time-record-report__header'>
                <div>
                    <h2>
                        {isEmployeeMode
                            ? 'Mi registro horario'
                            : 'Registro horario'}
                    </h2>
                    <p>
                        Control mensual con cuadrante previsto, fichaje real,
                        incidencias, ausencias y ubicaciones puntuales.
                    </p>
                </div>
                <div className='time-record-report__actions'>
                    <button
                        type='button'
                        onClick={() => loadReport()}
                        disabled={isLoading}
                    >
                        Actualizar
                    </button>
                    <button
                        type='button'
                        onClick={() => loadReport('excel')}
                        disabled={isLoading || !rows.length}
                    >
                        Excel
                    </button>
                    <button
                        type='button'
                        onClick={() => loadReport('pdf')}
                        disabled={isLoading || !rows.length}
                    >
                        PDF
                    </button>
                </div>
            </header>

            <form className='time-record-report__filters'>
                <label>
                    Mes
                    <input
                        type='month'
                        value={filters.month}
                        onChange={(event) =>
                            updateFilter('month', event.target.value)
                        }
                    />
                </label>
                {!isEmployeeMode ? (
                    <>
                        <label>
                            ID trabajador
                            <input
                                type='text'
                                value={filters.employeeId}
                                onChange={(event) =>
                                    updateFilter('employeeId', event.target.value)
                                }
                                placeholder='Opcional'
                            />
                        </label>
                        <label>
                            ID servicio
                            <input
                                type='text'
                                value={filters.serviceId}
                                onChange={(event) =>
                                    updateFilter('serviceId', event.target.value)
                                }
                                placeholder='Opcional'
                            />
                        </label>
                        <label>
                            ID delegacion
                            <input
                                type='text'
                                value={filters.delegationId}
                                onChange={(event) =>
                                    updateFilter(
                                        'delegationId',
                                        event.target.value
                                    )
                                }
                                placeholder='Opcional'
                            />
                        </label>
                    </>
                ) : null}
            </form>

            <div className='time-record-report__summary'>
                <article>
                    <span>Turnos</span>
                    <strong>{summary.totalRows || 0}</strong>
                </article>
                <article>
                    <span>Correctos</span>
                    <strong>{summary.okRows || 0}</strong>
                </article>
                <article>
                    <span>Incidencias</span>
                    <strong>{summary.issueRows || issueRows.length}</strong>
                </article>
                <article>
                    <span>Horas reales</span>
                    <strong>{Number(summary.realHours || 0).toFixed(2)}</strong>
                </article>
            </div>

            <section className='time-record-report__legal'>
                <h3>Informe legal operativo</h3>
                <p>
                    Este informe muestra el horario previsto y el horario real en
                    hora de España. Las coordenadas se muestran solo cuando el
                    fichaje las haya capturado y abren OpenStreetMap para poder
                    comprobar el punto.
                </p>
                <p>
                    La auditoria tecnica con hash se mantiene en el modulo
                    Auditoria fichajes para comprobar cambios, actor, IP y
                    trazabilidad.
                </p>
            </section>

            <div className='time-record-report__table-wrap'>
                <table className='time-record-report__table'>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Trabajador</th>
                            <th>Servicio</th>
                            <th>Previsto</th>
                            <th>Real</th>
                            <th>Estado</th>
                            <th>Diferencia</th>
                            <th>Ubicacion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length ? (
                            rows.map((row) => (
                                <tr key={`${row.id}-${row.source}`}>
                                    <td>{row.dateLabel || '-'}</td>
                                    <td>
                                        <strong>{row.employeeName}</strong>
                                        <span>{row.employeeDni || row.employeeEmail}</span>
                                    </td>
                                    <td>
                                        <strong>{row.serviceName}</strong>
                                        <span>
                                            {[row.serviceCity, row.serviceDelegation]
                                                .filter(Boolean)
                                                .join(' - ')}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{row.plannedRange}</strong>
                                        <span>
                                            {Number(row.plannedHours || 0).toFixed(
                                                2
                                            )}{' '}
                                            h
                                        </span>
                                    </td>
                                    <td>
                                        <span>{row.realStart || 'Sin entrada'}</span>
                                        <span>{row.realEnd || 'Sin salida'}</span>
                                    </td>
                                    <td>
                                        <span
                                            className={`time-record-status ${statusClass(
                                                row.status
                                            )}`}
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                    <td>{row.differenceLabel}</td>
                                    <td>
                                        <div className='time-record-report__maps'>
                                            {row.mapInUrl ? (
                                                <a
                                                    href={row.mapInUrl}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    Entrada
                                                </a>
                                            ) : null}
                                            {row.mapOutUrl ? (
                                                <a
                                                    href={row.mapOutUrl}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    Salida
                                                </a>
                                            ) : null}
                                            {!row.mapInUrl && !row.mapOutUrl
                                                ? '-'
                                                : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan='8'>
                                    {isLoading
                                        ? 'Cargando registro horario...'
                                        : 'No hay registros para este filtro.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default TimeRecordReportComponent;
