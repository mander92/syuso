import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    assignServiceVehicles,
    deleteVehicle,
    fetchVehicles,
    saveVehicle,
} from '../../services/vehicleService.js';
import { fetchAllServicesServices } from '../../services/serviceService.js';
import './AdminVehiclesSection.css';

const emptyForm = {
    name: '',
    plate: '',
    ownershipType: 'own',
    fuelType: 'diesel',
    brand: '',
    model: '',
    vehicleYear: '',
    vin: '',
    insuranceCompany: '',
    insurancePolicy: '',
    insuranceExpiryDate: '',
    itvExpiryDate: '',
    documentationNotes: '',
    active: true,
};

const ownershipLabels = {
    own: 'Propio',
    renting: 'Renting',
};

const fuelLabels = {
    gasoline: 'Gasolina',
    diesel: 'Diesel',
    hybrid: 'Hibrido',
    electric: 'Electrico',
    other: 'Otro',
};

const formatDateTime = (value) => {
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

const AdminVehiclesSection = () => {
    const { authToken } = useContext(AuthContext);
    const [vehicles, setVehicles] = useState([]);
    const [fuelLogs, setFuelLogs] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [services, setServices] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState('');
    const [filters, setFilters] = useState({ search: '', active: '1' });
    const [assignment, setAssignment] = useState({
        serviceId: '',
        vehicleIds: [],
    });
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            const [vehicleData, serviceData] = await Promise.all([
                fetchVehicles(authToken, filters),
                fetchAllServicesServices('', authToken),
            ]);
            setVehicles(vehicleData.vehicles || []);
            setFuelLogs(vehicleData.fuelLogs || []);
            setInspections(vehicleData.inspections || []);
            setServices(serviceData.data || serviceData || []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar vehiculos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

    const activeVehicles = useMemo(
        () => vehicles.filter((vehicle) => Number(vehicle.active) === 1),
        [vehicles]
    );

    const selectedServiceVehicles = useMemo(() => {
        if (!assignment.serviceId) return [];
        return vehicles
            .filter((vehicle) =>
                (vehicle.services || []).some(
                    (service) => service.serviceId === assignment.serviceId
                )
            )
            .map((vehicle) => vehicle.id);
    }, [assignment.serviceId, vehicles]);

    useEffect(() => {
        if (!assignment.serviceId) return;
        setAssignment((prev) => ({
            ...prev,
            vehicleIds: selectedServiceVehicles,
        }));
    }, [assignment.serviceId, selectedServiceVehicles]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await saveVehicle(authToken, form, editingId);
            toast.success(editingId ? 'Vehiculo actualizado' : 'Vehiculo creado');
            setForm(emptyForm);
            setEditingId('');
            await loadData();
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar el vehiculo');
        }
    };

    const handleEdit = (vehicle) => {
        setEditingId(vehicle.id);
        setForm({
            name: vehicle.name || '',
            plate: vehicle.plate || '',
            ownershipType: vehicle.ownershipType || 'own',
            fuelType: vehicle.fuelType || 'diesel',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            vehicleYear: vehicle.vehicleYear || '',
            vin: vehicle.vin || '',
            insuranceCompany: vehicle.insuranceCompany || '',
            insurancePolicy: vehicle.insurancePolicy || '',
            insuranceExpiryDate: vehicle.insuranceExpiryDate
                ? String(vehicle.insuranceExpiryDate).slice(0, 10)
                : '',
            itvExpiryDate: vehicle.itvExpiryDate
                ? String(vehicle.itvExpiryDate).slice(0, 10)
                : '',
            documentationNotes: vehicle.documentationNotes || '',
            active: Number(vehicle.active) === 1,
        });
    };

    const handleDelete = async (vehicleId) => {
        if (!window.confirm('Seguro que quieres borrar este vehiculo?')) return;
        try {
            await deleteVehicle(authToken, vehicleId);
            toast.success('Vehiculo borrado');
            await loadData();
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar');
        }
    };

    const toggleAssignmentVehicle = (vehicleId) => {
        setAssignment((prev) => ({
            ...prev,
            vehicleIds: prev.vehicleIds.includes(vehicleId)
                ? prev.vehicleIds.filter((id) => id !== vehicleId)
                : [...prev.vehicleIds, vehicleId],
        }));
    };

    const handleAssign = async (event) => {
        event.preventDefault();
        if (!assignment.serviceId) {
            toast.error('Selecciona un servicio');
            return;
        }
        try {
            await assignServiceVehicles(
                authToken,
                assignment.serviceId,
                assignment.vehicleIds
            );
            toast.success('Vehiculos asignados');
            await loadData();
        } catch (error) {
            toast.error(error.message || 'No se pudo asignar');
        }
    };

    return (
        <section className='admin-vehicles'>
            <header className='admin-vehicles-header'>
                <div>
                    <p>VEHICULOS</p>
                    <h2>Gestion de vehiculos</h2>
                    <span>
                        Controla documentacion, asignaciones a servicios,
                        inspecciones, kilometraje y combustible.
                    </span>
                </div>
                <button type='button' onClick={loadData} disabled={loading}>
                    Actualizar
                </button>
            </header>

            <div className='admin-vehicles-layout'>
                <form className='admin-vehicles-card' onSubmit={handleSubmit}>
                    <h3>{editingId ? 'Editar vehiculo' : 'Nuevo vehiculo'}</h3>
                    <div className='admin-vehicles-grid'>
                        <label>
                            Nombre
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                required
                            />
                        </label>
                        <label>
                            Matricula
                            <input
                                value={form.plate}
                                onChange={(e) =>
                                    setForm({ ...form, plate: e.target.value })
                                }
                                required
                            />
                        </label>
                        <label>
                            Tipo
                            <select
                                value={form.ownershipType}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        ownershipType: e.target.value,
                                    })
                                }
                            >
                                <option value='own'>Propio</option>
                                <option value='renting'>Renting</option>
                            </select>
                        </label>
                        <label>
                            Combustible
                            <select
                                value={form.fuelType}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        fuelType: e.target.value,
                                    })
                                }
                            >
                                <option value='diesel'>Diesel</option>
                                <option value='gasoline'>Gasolina</option>
                                <option value='hybrid'>Hibrido</option>
                                <option value='electric'>Electrico</option>
                                <option value='other'>Otro</option>
                            </select>
                        </label>
                        <label>
                            Marca
                            <input
                                value={form.brand}
                                onChange={(e) =>
                                    setForm({ ...form, brand: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Modelo
                            <input
                                value={form.model}
                                onChange={(e) =>
                                    setForm({ ...form, model: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Ano
                            <input
                                type='number'
                                value={form.vehicleYear}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        vehicleYear: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Bastidor
                            <input
                                value={form.vin}
                                onChange={(e) =>
                                    setForm({ ...form, vin: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Seguro
                            <input
                                value={form.insuranceCompany}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        insuranceCompany: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Poliza
                            <input
                                value={form.insurancePolicy}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        insurancePolicy: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Vence seguro
                            <input
                                type='date'
                                value={form.insuranceExpiryDate}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        insuranceExpiryDate: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Vence ITV
                            <input
                                type='date'
                                value={form.itvExpiryDate}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        itvExpiryDate: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label className='admin-vehicles-wide'>
                            Documentacion / notas
                            <textarea
                                value={form.documentationNotes}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        documentationNotes: e.target.value,
                                    })
                                }
                            />
                        </label>
                    </div>
                    <div className='admin-vehicles-actions'>
                        {editingId ? (
                            <button
                                type='button'
                                onClick={() => {
                                    setEditingId('');
                                    setForm(emptyForm);
                                }}
                            >
                                Cancelar
                            </button>
                        ) : null}
                        <button type='submit'>Guardar vehiculo</button>
                    </div>
                </form>

                <form className='admin-vehicles-card' onSubmit={handleAssign}>
                    <h3>Asignar a servicio</h3>
                    <label>
                        Servicio
                        <select
                            value={assignment.serviceId}
                            onChange={(e) =>
                                setAssignment({
                                    serviceId: e.target.value,
                                    vehicleIds: [],
                                })
                            }
                        >
                            <option value=''>Selecciona</option>
                            {services.map((service) => {
                                const serviceId = service.serviceId || service.id;
                                if (!serviceId) return null;
                                return (
                                <option key={serviceId} value={serviceId}>
                                    {service.name} - {service.province}
                                </option>
                                );
                            })}
                        </select>
                    </label>
                    <div className='admin-vehicles-checklist'>
                        {activeVehicles.map((vehicle) => (
                            <label key={vehicle.id}>
                                <input
                                    type='checkbox'
                                    checked={assignment.vehicleIds.includes(
                                        vehicle.id
                                    )}
                                    onChange={() =>
                                        toggleAssignmentVehicle(vehicle.id)
                                    }
                                />
                                <span>
                                    {vehicle.name} · {vehicle.plate}
                                </span>
                            </label>
                        ))}
                    </div>
                    <button type='submit'>Guardar asignacion</button>
                </form>
            </div>

            <section className='admin-vehicles-card'>
                <div className='admin-vehicles-list-head'>
                    <h3>Vehiculos</h3>
                    <div className='admin-vehicles-filters'>
                        <input
                            placeholder='Buscar vehiculo...'
                            value={filters.search}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    search: e.target.value,
                                })
                            }
                        />
                        <select
                            value={filters.active}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    active: e.target.value,
                                })
                            }
                        >
                            <option value='1'>Activos</option>
                            <option value='0'>Inactivos</option>
                            <option value=''>Todos</option>
                        </select>
                        <button type='button' onClick={loadData}>
                            Filtrar
                        </button>
                    </div>
                </div>
                <div className='admin-vehicles-list'>
                    {vehicles.map((vehicle) => (
                        <article key={vehicle.id} className='admin-vehicle-row'>
                            <div>
                                <strong>
                                    {vehicle.name} · {vehicle.plate}
                                </strong>
                                <span>
                                    {ownershipLabels[vehicle.ownershipType]} ·{' '}
                                    {fuelLabels[vehicle.fuelType]} ·{' '}
                                    {[vehicle.brand, vehicle.model]
                                        .filter(Boolean)
                                        .join(' ')}
                                </span>
                                <small>
                                    Servicios:{' '}
                                    {(vehicle.services || [])
                                        .map((service) => service.serviceName)
                                        .join(', ') || 'Sin asignar'}
                                </small>
                            </div>
                            <div className='admin-vehicle-row-actions'>
                                <button
                                    type='button'
                                    onClick={() => handleEdit(vehicle)}
                                >
                                    Editar
                                </button>
                                <button
                                    type='button'
                                    className='danger'
                                    onClick={() => handleDelete(vehicle.id)}
                                >
                                    Borrar
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <div className='admin-vehicles-layout'>
                <section className='admin-vehicles-card'>
                    <h3>Inspecciones</h3>
                    <div className='admin-vehicles-log-list'>
                        {inspections.map((inspection) => (
                            <article key={inspection.id}>
                                <strong>
                                    {inspection.vehicleName} · {inspection.plate}
                                </strong>
                                <span>
                                    {inspection.serviceName} ·{' '}
                                    {inspection.employeeName}
                                </span>
                                <small>
                                    {formatDateTime(inspection.inspectionDate)} ·{' '}
                                    {inspection.odometerKm || '-'} km
                                </small>
                            </article>
                        ))}
                    </div>
                </section>
                <section className='admin-vehicles-card'>
                    <h3>Combustible</h3>
                    <div className='admin-vehicles-log-list'>
                        {fuelLogs.map((log) => (
                            <article key={log.id}>
                                <strong>
                                    {log.vehicleName} · {log.plate}
                                </strong>
                                <span>
                                    {log.liters || 0} L · {log.amount || 0} €
                                </span>
                                <small>
                                    {formatDateTime(log.fuelDate)} ·{' '}
                                    {log.odometerKm || '-'} km
                                </small>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </section>
    );
};

export default AdminVehiclesSection;
