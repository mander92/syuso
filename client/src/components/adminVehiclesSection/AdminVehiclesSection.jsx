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
import { buildImageUrl } from '../../utils/imageUrl.js';
import './AdminVehiclesSection.css';

const emptyForm = {
    name: '',
    plate: '',
    ownershipType: 'own',
    fuelType: 'diesel',
    brand: '',
    model: '',
    vehicleYear: '',
    customerServicePhone: '',
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

const checklistLabels = {
    lights: 'Luces',
    tires: 'Neumaticos',
    bodywork: 'Carroceria',
    interior: 'Interior',
    oil: 'Aceite',
    documents: 'Documentacion',
    cleanliness: 'Limpieza',
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

const parseJsonValue = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const uploadUrl = (filePath) => buildImageUrl(filePath);

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
    const [inspectionDetail, setInspectionDetail] = useState(null);
    const [vehicleFormOpen, setVehicleFormOpen] = useState(false);

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
            setVehicleFormOpen(false);
            await loadData();
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar el vehiculo');
        }
    };

    const openNewVehicle = () => {
        setEditingId('');
        setForm(emptyForm);
        setVehicleFormOpen(true);
    };

    const closeVehicleForm = () => {
        setEditingId('');
        setForm(emptyForm);
        setVehicleFormOpen(false);
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
            customerServicePhone: vehicle.customerServicePhone || '',
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
        setVehicleFormOpen(true);
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

    const openInspectionDetail = (inspection) => {
        setInspectionDetail({
            ...inspection,
            checklist: parseJsonValue(inspection.checklist, {}),
            photoPaths: parseJsonValue(inspection.photoPaths, []),
            ticketPaths: parseJsonValue(inspection.ticketPaths, []),
        });
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
                <div className='admin-vehicles-header-actions'>
                    <button type='button' onClick={openNewVehicle}>
                        Nuevo vehiculo
                    </button>
                    <button type='button' onClick={loadData} disabled={loading}>
                        Actualizar
                    </button>
                </div>
            </header>

            {vehicleFormOpen ? (
                <div className='vehicle-admin-modal'>
                    <button
                        type='button'
                        className='vehicle-admin-modal__backdrop'
                        onClick={closeVehicleForm}
                        aria-label='Cerrar formulario de vehiculo'
                    />
                    <form
                        className='admin-vehicles-card vehicle-admin-modal__panel'
                        onSubmit={handleSubmit}
                    >
                        <header className='vehicle-admin-modal__header'>
                            <div>
                                <h3>
                                    {editingId
                                        ? 'Editar vehiculo'
                                        : 'Nuevo vehiculo'}
                                </h3>
                                <p>
                                    Completa la ficha del vehiculo y su
                                    documentacion.
                                </p>
                            </div>
                            <button type='button' onClick={closeVehicleForm}>
                                Cerrar
                            </button>
                        </header>
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
                            Año
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
                            Teléfono atención cliente
                            <input
                                value={form.customerServicePhone}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        customerServicePhone: e.target.value,
                                    })
                                }
                                placeholder='Revisiones, aceite, asistencia...'
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
                        <button type='button' onClick={closeVehicleForm}>
                            Cancelar
                        </button>
                        <button type='submit'>Guardar vehiculo</button>
                    </div>
                </form>
                </div>
            ) : null}

            <div className='admin-vehicles-layout admin-vehicles-layout--single'>
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
                                {vehicle.customerServicePhone ? (
                                    <small>
                                        Atención cliente:{' '}
                                        {vehicle.customerServicePhone}
                                    </small>
                                ) : null}
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
                                <button
                                    type='button'
                                    onClick={() => openInspectionDetail(inspection)}
                                >
                                    Ver detalle
                                </button>
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

            {inspectionDetail ? (
                <div className='vehicle-admin-modal'>
                    <button
                        type='button'
                        className='vehicle-admin-modal__backdrop'
                        onClick={() => setInspectionDetail(null)}
                        aria-label='Cerrar detalle de inspeccion'
                    />
                    <div className='vehicle-admin-modal__panel'>
                        <header className='vehicle-admin-modal__header'>
                            <div>
                                <h3>Detalle de inspeccion</h3>
                                <p>{formatDateTime(inspectionDetail.inspectionDate)}</p>
                            </div>
                            <button
                                type='button'
                                onClick={() => setInspectionDetail(null)}
                            >
                                Cerrar
                            </button>
                        </header>

                        <div className='vehicle-admin-detail-grid'>
                            <div>
                                <span>Trabajador</span>
                                <strong>{inspectionDetail.employeeName || '-'}</strong>
                                <small>{inspectionDetail.employeeEmail || '-'}</small>
                            </div>
                            <div>
                                <span>Vehiculo</span>
                                <strong>
                                    {inspectionDetail.vehicleName || '-'} ·{' '}
                                    {inspectionDetail.plate || '-'}
                                </strong>
                                <small>
                                    {[inspectionDetail.brand, inspectionDetail.model]
                                        .filter(Boolean)
                                        .join(' ') || '-'}
                                </small>
                            </div>
                            <div>
                                <span>Servicio</span>
                                <strong>{inspectionDetail.serviceName || '-'}</strong>
                                <small>{inspectionDetail.province || '-'}</small>
                            </div>
                            <div>
                                <span>Kilometraje</span>
                                <strong>{inspectionDetail.odometerKm || '-'} km</strong>
                            </div>
                            <div>
                                <span>Combustible</span>
                                <strong>{inspectionDetail.fuelLevel || '-'}</strong>
                                <small>
                                    {inspectionDetail.fuelLiters || 0} L ·{' '}
                                    {inspectionDetail.fuelAmount || 0} €
                                </small>
                            </div>
                            <div>
                                <span>Limpieza</span>
                                <strong>{inspectionDetail.cleanliness || '-'}</strong>
                            </div>
                        </div>

                        <section className='vehicle-admin-detail-section'>
                            <h4>Checklist</h4>
                            <div className='vehicle-admin-checklist'>
                                {Object.entries(checklistLabels).map(
                                    ([key, label]) => (
                                        <span
                                            key={key}
                                            className={
                                                inspectionDetail.checklist?.[key]
                                                    ? 'is-ok'
                                                    : ''
                                            }
                                        >
                                            {label}:{' '}
                                            {inspectionDetail.checklist?.[key]
                                                ? 'Si'
                                                : 'No'}
                                        </span>
                                    )
                                )}
                            </div>
                        </section>

                        <section className='vehicle-admin-detail-section'>
                            <h4>Observaciones / danos</h4>
                            <p>{inspectionDetail.damageNotes || '-'}</p>
                        </section>

                        <section className='vehicle-admin-detail-section'>
                            <h4>Fotos del vehiculo</h4>
                            <div className='vehicle-admin-files'>
                                {inspectionDetail.photoPaths?.length ? (
                                    inspectionDetail.photoPaths.map((filePath) => (
                                        <a
                                            key={filePath}
                                            href={uploadUrl(filePath)}
                                            target='_blank'
                                            rel='noreferrer'
                                        >
                                            Ver foto
                                        </a>
                                    ))
                                ) : (
                                    <span>Sin fotos</span>
                                )}
                            </div>
                        </section>

                        <section className='vehicle-admin-detail-section'>
                            <h4>Tickets gasolina/diesel</h4>
                            <div className='vehicle-admin-files'>
                                {inspectionDetail.ticketPaths?.length ? (
                                    inspectionDetail.ticketPaths.map((filePath) => (
                                        <a
                                            key={filePath}
                                            href={uploadUrl(filePath)}
                                            target='_blank'
                                            rel='noreferrer'
                                        >
                                            Ver ticket
                                        </a>
                                    ))
                                ) : (
                                    <span>Sin tickets</span>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default AdminVehiclesSection;
