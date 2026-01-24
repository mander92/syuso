import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchEmployeeScheduleShifts } from '../../services/serviceService.js';
import { AuthContext } from '../../context/AuthContext.jsx';
import { useContext } from 'react';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import './EmployeeScheduleComponent.css';

const EmployeeScheduleComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [shifts, setShifts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const loadShifts = useCallback(async () => {
        if (!authToken) return;
        try {
            setIsLoading(true);
            const data = await fetchEmployeeScheduleShifts(authToken, month);
            setShifts(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar los turnos');
        } finally {
            setIsLoading(false);
        }
    }, [authToken, month]);

    useEffect(() => {
        loadShifts();
    }, [loadShifts]);

    const serviceRows = useMemo(() => {
        const map = new Map();
        shifts.forEach((shift) => {
            if (!shift?.serviceId) return;
            if (!map.has(shift.serviceId)) {
                map.set(shift.serviceId, {
                    id: shift.serviceId,
                    firstName: shift.serviceName || 'Servicio',
                    lastName: '',
                });
            }
        });
        return Array.from(map.values());
    }, [shifts]);

    const gridShifts = useMemo(
        () =>
            shifts.map((shift) => ({
                ...shift,
                employeeId: shift.serviceId || 'unassigned',
            })),
        [shifts]
    );

    const handleExport = async () => {
        if (!authToken) return;
        try {
            setIsDownloading(true);
            const data = await fetchEmployeeScheduleShifts(
                authToken,
                month,
                true
            );
            if (data?.excelFilePath) {
                const baseUrl = import.meta.env.VITE_API_URL || '/api';
                window.open(`${baseUrl}${data.excelFilePath}`, '_blank');
            } else {
                toast.error('No se pudo generar el Excel');
            }
        } catch (error) {
            toast.error(error.message || 'No se pudo generar el Excel');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <section className='employee-schedule'>
            <header className='employee-schedule-header'>
                <div>
                    <h2>Mis Cuadrantes</h2>
                    <p>Turnos programados por servicio y mes.</p>
                </div>
                <div className='employee-schedule-actions'>
                    <label htmlFor='employee-schedule-month'>Mes</label>
                    <input
                        id='employee-schedule-month'
                        type='month'
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                    />
                    <button
                        type='button'
                        className='employee-schedule-btn'
                        onClick={() => setIsGridOpen(true)}
                    >
                        Ver cuadrante
                    </button>
                    <button
                        type='button'
                        className='employee-schedule-btn employee-schedule-btn--primary'
                        onClick={handleExport}
                        disabled={isDownloading}
                    >
                        {isDownloading ? 'Generando...' : 'Exportar Excel'}
                    </button>
                </div>
            </header>

            {isLoading ? (
                <p className='employee-schedule-empty'>Cargando turnos...</p>
            ) : shifts.length ? null : (
                <p className='employee-schedule-empty'>Sin turnos programados.</p>
            )}

            {isGridOpen && (
                <div className='employee-schedule-modal'>
                    <button
                        type='button'
                        className='employee-schedule-modal__backdrop'
                        onClick={() => setIsGridOpen(false)}
                        aria-label='Cerrar cuadrante'
                    />
                    <div className='employee-schedule-modal__panel'>
                        <div className='employee-schedule-modal__header'>
                            <div>
                                <h3>Mis Cuadrantes</h3>
                                <p>{month}</p>
                            </div>
                            <button
                                type='button'
                                className='employee-schedule-modal__close'
                                onClick={() => setIsGridOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='employee-schedule-modal__body'>
                            <ServiceScheduleGrid
                                month={month}
                                shifts={gridShifts}
                                employees={serviceRows}
                                absencesByEmployee={{}}
                                onShiftUpdate={() => {}}
                                readOnly
                                showUnassigned={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default EmployeeScheduleComponent;
