import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    createWarehouseMovement,
    deleteWarehouseMovement,
    fetchWarehouse,
} from '../../services/warehouseService.js';
import './AdminWarehouseSection.css';

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = {
    movementType: 'in',
    itemName: '',
    category: 'Uniformidad',
    size: '',
    quantity: 1,
    unitPrice: '',
    movementDate: today(),
    employeeId: '',
    recipientName: '',
    notes: '',
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatMoney = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
    });
};

const AdminWarehouseSection = () => {
    const { authToken } = useContext(AuthContext);
    const [movements, setMovements] = useState([]);
    const [stock, setStock] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filters, setFilters] = useState({
        movementType: '',
        itemName: '',
        employeeId: '',
        fromDate: '',
        toDate: '',
    });
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const employeeOptions = useMemo(
        () =>
            employees
                .filter((employee) => employee.role === 'employee')
                .sort((a, b) =>
                    `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(
                        `${b.firstName || ''} ${b.lastName || ''}`,
                        'es',
                        { sensitivity: 'base' }
                    )
                ),
        [employees]
    );

    const loadWarehouse = async (nextFilters = filters) => {
        if (!authToken) return;
        try {
            setLoading(true);
            const data = await fetchWarehouse(authToken, nextFilters);
            setMovements(data.movements || []);
            setStock(data.stock || []);
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar almacen');
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        if (!authToken) return;
        try {
            const data = await fetchAllUsersServices('role=employee', authToken);
            setEmployees(data || []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar empleados');
        }
    };

    useEffect(() => {
        loadWarehouse();
        loadEmployees();
    }, [authToken]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        const nextFilters = { ...filters, [name]: value };
        setFilters(nextFilters);
        loadWarehouse(nextFilters);
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.itemName.trim()) {
            toast.error('Indica que prenda entra o sale');
            return;
        }

        try {
            setSaving(true);
            await createWarehouseMovement(authToken, form);
            toast.success('Movimiento guardado');
            setForm((prev) => ({
                ...initialForm,
                movementType: prev.movementType,
                movementDate: today(),
            }));
            await loadWarehouse();
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (movementId) => {
        if (!window.confirm('Quieres borrar este movimiento?')) return;
        try {
            await deleteWarehouseMovement(authToken, movementId);
            toast.success('Movimiento eliminado');
            await loadWarehouse();
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar');
        }
    };

    return (
        <section className='warehouse'>
            <header className='warehouse-header'>
                <div>
                    <p>ALMACEN</p>
                    <h2>Control de ropa</h2>
                    <span>
                        Registra entradas, salidas, precios y entregas a
                        trabajadores.
                    </span>
                </div>
            </header>

            <div className='warehouse-layout'>
                <form className='warehouse-card warehouse-form' onSubmit={handleSubmit}>
                    <h3>Nuevo movimiento</h3>
                    <div className='warehouse-grid'>
                        <label>
                            Tipo
                            <select
                                name='movementType'
                                value={form.movementType}
                                onChange={handleFormChange}
                            >
                                <option value='in'>Entrada</option>
                                <option value='out'>Salida</option>
                            </select>
                        </label>
                        <label>
                            Prenda
                            <input
                                name='itemName'
                                value={form.itemName}
                                onChange={handleFormChange}
                                placeholder='Camisa, pantalon, chaqueta...'
                            />
                        </label>
                        <label>
                            Categoria
                            <input
                                name='category'
                                value={form.category}
                                onChange={handleFormChange}
                                placeholder='Uniformidad'
                            />
                        </label>
                        <label>
                            Talla
                            <input
                                name='size'
                                value={form.size}
                                onChange={handleFormChange}
                                placeholder='S, M, L, 42...'
                            />
                        </label>
                        <label>
                            Cantidad
                            <input
                                name='quantity'
                                type='number'
                                min='1'
                                value={form.quantity}
                                onChange={handleFormChange}
                            />
                        </label>
                        <label>
                            Precio unidad
                            <input
                                name='unitPrice'
                                type='number'
                                min='0'
                                step='0.01'
                                value={form.unitPrice}
                                onChange={handleFormChange}
                                placeholder='0.00'
                            />
                        </label>
                        <label>
                            Fecha
                            <input
                                name='movementDate'
                                type='date'
                                value={form.movementDate}
                                onChange={handleFormChange}
                            />
                        </label>
                        <label>
                            Trabajador
                            <select
                                name='employeeId'
                                value={form.employeeId}
                                onChange={handleFormChange}
                            >
                                <option value=''>Sin asignar</option>
                                {employeeOptions.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.firstName} {employee.lastName}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Entregado a
                            <input
                                name='recipientName'
                                value={form.recipientName}
                                onChange={handleFormChange}
                                placeholder='Nombre si no esta en usuarios'
                            />
                        </label>
                        <label className='warehouse-field-wide'>
                            Notas
                            <textarea
                                name='notes'
                                value={form.notes}
                                onChange={handleFormChange}
                                placeholder='Observaciones, estado, proveedor...'
                            />
                        </label>
                    </div>
                    <button className='warehouse-btn' type='submit' disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar movimiento'}
                    </button>
                </form>

                <aside className='warehouse-card warehouse-stock'>
                    <h3>Stock actual</h3>
                    {stock.length ? (
                        <div className='warehouse-stock-list'>
                            {stock.map((item) => (
                                <article
                                    key={`${item.itemName}-${item.category}-${item.size}`}
                                    className='warehouse-stock-item'
                                >
                                    <div>
                                        <strong>{item.itemName}</strong>
                                        <span>
                                            {[item.category, item.size]
                                                .filter(Boolean)
                                                .join(' · ') || 'Sin detalle'}
                                        </span>
                                    </div>
                                    <strong>{Number(item.stock || 0)}</strong>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className='warehouse-empty'>Sin stock registrado.</p>
                    )}
                </aside>
            </div>

            <section className='warehouse-card'>
                <div className='warehouse-list-header'>
                    <div>
                        <h3>Movimientos</h3>
                        <p>{loading ? 'Cargando...' : `${movements.length} registros`}</p>
                    </div>
                    <div className='warehouse-filters'>
                        <select
                            name='movementType'
                            value={filters.movementType}
                            onChange={handleFilterChange}
                        >
                            <option value=''>Todos</option>
                            <option value='in'>Entradas</option>
                            <option value='out'>Salidas</option>
                        </select>
                        <input
                            name='itemName'
                            value={filters.itemName}
                            onChange={handleFilterChange}
                            placeholder='Buscar prenda'
                        />
                        <select
                            name='employeeId'
                            value={filters.employeeId}
                            onChange={handleFilterChange}
                        >
                            <option value=''>Todos los empleados</option>
                            {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.firstName} {employee.lastName}
                                </option>
                            ))}
                        </select>
                        <input
                            name='fromDate'
                            type='date'
                            value={filters.fromDate}
                            onChange={handleFilterChange}
                        />
                        <input
                            name='toDate'
                            type='date'
                            value={filters.toDate}
                            onChange={handleFilterChange}
                        />
                    </div>
                </div>

                <div className='warehouse-table-wrap'>
                    <table className='warehouse-table'>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Prenda</th>
                                <th>Talla</th>
                                <th>Cantidad</th>
                                <th>Precio</th>
                                <th>Trabajador / destino</th>
                                <th>Notas</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((movement) => (
                                <tr key={movement.id}>
                                    <td>{formatDate(movement.movementDate)}</td>
                                    <td>
                                        <span
                                            className={`warehouse-pill warehouse-pill--${movement.movementType}`}
                                        >
                                            {movement.movementType === 'in'
                                                ? 'Entrada'
                                                : 'Salida'}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{movement.itemName}</strong>
                                        <span>{movement.category || ''}</span>
                                    </td>
                                    <td>{movement.size || '-'}</td>
                                    <td>{movement.quantity}</td>
                                    <td>
                                        {movement.unitPrice
                                            ? formatMoney(movement.unitPrice)
                                            : '-'}
                                    </td>
                                    <td>
                                        {movement.employeeName ||
                                            movement.recipientName ||
                                            '-'}
                                    </td>
                                    <td>{movement.notes || '-'}</td>
                                    <td>
                                        <button
                                            type='button'
                                            className='warehouse-delete'
                                            onClick={() => handleDelete(movement.id)}
                                        >
                                            Borrar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!movements.length ? (
                                <tr>
                                    <td colSpan='9' className='warehouse-empty'>
                                        No hay movimientos con estos filtros.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
};

export default AdminWarehouseSection;
