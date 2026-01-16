import { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import { fetchAllServicesServices } from '../../services/serviceService.js';
import { fetchCreateShiftRecord } from '../../services/shiftRecordService.js';
import './ShiftCreate.css';

const ShiftCreate = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [clockIn, setClockIn] = useState('');
    const [clockOut, setClockOut] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!authToken) return;

            try {
                setLoading(true);

                const employeeParams = new URLSearchParams({
                    role: 'employee',
                    active: '1',
                });
                const employeesData = await fetchAllUsersServices(
                    employeeParams.toString(),
                    authToken
                );

                const servicesData = await fetchAllServicesServices(
                    '',
                    authToken
                );

                setEmployees(
                    Array.isArray(employeesData)
                        ? employeesData
                        : employeesData?.users || []
                );
                setServices(servicesData?.data || []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudo cargar la informacion'
                );
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [authToken]);

    const serviceOptions = useMemo(
        () =>
            services.map((service) => ({
                id: service.serviceId,
                label: service.name
                    ? `${service.name} (${service.type})`
                    : `${service.type} - ${service.city || ''}`,
                startDateTime: service.startDateTime,
            })),
        [services]
    );

    if (!authToken) return <Navigate to='/login' />;
    if (user && user.role !== 'admin' && user.role !== 'sudo') {
        return (
            <div className='shift-create-page'>
                <div className='shift-create-card'>
                    <h2>Acceso restringido</h2>
                    <p>Solo administradores pueden crear turnos.</p>
                    <NavLink className='shift-create-back' to='/account'>
                        Volver al panel
                    </NavLink>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!employeeId || !serviceId) {
            toast.error('Selecciona empleado y servicio');
            return;
        }

        const normalizeDateTime = (value) => {
            if (!value) return null;
            const [datePart, timePart] = value.split('T');
            return `${datePart} ${timePart}:00`;
        };

        try {
            setSaving(true);
            const body = await fetchCreateShiftRecord(
                authToken,
                serviceId,
                employeeId,
                normalizeDateTime(clockIn),
                normalizeDateTime(clockOut)
            );
            toast.success(body.message || 'Turno creado');
            setEmployeeId('');
            setServiceId('');
            setClockIn('');
            setClockOut('');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el turno');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='shift-create-page'>
            <div className='shift-create-header'>
                <div>
                    <h1>Crear turno</h1>
                    <p>Asigna un empleado a un servicio.</p>
                </div>
                <NavLink className='shift-create-back' to='/account'>
                    Volver al panel
                </NavLink>
            </div>

            {loading ? (
                <div className='shift-create-card'>
                    <p>Cargando datos...</p>
                </div>
            ) : (
                <form className='shift-create-card' onSubmit={handleSubmit}>
                    <label htmlFor='serviceId'>Servicio</label>
                    <select
                        id='serviceId'
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        required
                    >
                        <option value=''>Selecciona un servicio</option>
                        {serviceOptions.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.label}
                            </option>
                        ))}
                    </select>

                    <label htmlFor='employeeId'>Empleado</label>
                    <select
                        id='employeeId'
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                    >
                        <option value=''>Selecciona un empleado</option>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                            </option>
                        ))}
                    </select>

                    <label htmlFor='clockIn'>Entrada (opcional)</label>
                    <input
                        id='clockIn'
                        type='datetime-local'
                        value={clockIn}
                        onChange={(e) => setClockIn(e.target.value)}
                    />

                    <label htmlFor='clockOut'>Salida (opcional)</label>
                    <input
                        id='clockOut'
                        type='datetime-local'
                        value={clockOut}
                        onChange={(e) => setClockOut(e.target.value)}
                    />

                    <button type='submit' disabled={saving}>
                        {saving ? 'Creando...' : 'Crear turno'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default ShiftCreate;
