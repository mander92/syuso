import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchEmployeeScheduleShifts } from '../../services/serviceService.js';
import { AuthContext } from '../../context/AuthContext.jsx';
import { useContext } from 'react';
import ServiceScheduleGrid from '../serviceSchedule/ServiceScheduleGrid.jsx';
import { fetchMyShiftSwapRequests } from '../../services/shiftSwapService.js';
import '../serviceSchedule/ServiceSchedulePanel.css';
import './EmployeeScheduleComponent.css';

const EmployeeScheduleComponent = () => {
    const { authToken } = useContext(AuthContext);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [shifts, setShifts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shiftRequests, setShiftRequests] = useState([]);

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

    const visibleShiftRequests = useMemo(() => {
        const [year, monthNumber] = month.split('-');
        const monthToken = `${monthNumber}/${year}`;
        return shiftRequests.filter((request) => {
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
    }, [month, shiftRequests]);

    const renderShiftRequestSummary = () => {
        if (!visibleShiftRequests.length) return null;
        return (
            <div className='schedule-requests-summary'>
                <strong>Peticiones aprobadas o en aprobacion</strong>
                <div className='schedule-requests-summary__list'>
                    {visibleShiftRequests.map((request) => (
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
                                {request.serviceName || 'Servicio'}
                            </small>
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
                </div>
            </header>

            {isLoading ? (
                <p className='employee-schedule-empty'>Cargando turnos...</p>
            ) : shifts.length ? (
                <div className='employee-schedule-grid'>
                    {renderShiftRequestSummary()}
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
            ) : (
                <p className='employee-schedule-empty'>Sin turnos programados.</p>
            )}
        </section>
    );
};

export default EmployeeScheduleComponent;
