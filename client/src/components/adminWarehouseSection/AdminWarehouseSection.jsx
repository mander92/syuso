import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    createWarehouseMovement,
    deleteWarehouseMovement,
    deleteWarehouseStockItem,
    fetchWarehouse,
} from '../../services/warehouseService.js';
import './AdminWarehouseSection.css';

const today = () => new Date().toISOString().slice(0, 10);
const pageSize = 6;

const initialForm = {
    movementType: 'in',
    itemName: '',
    category: 'Uniformidad',
    size: '',
    quantity: 1,
    unitPrice: '',
    movementDate: today(),
    employeeId: '',
    notes: '',
};

const formatMovementDateTime = (movement) => {
    const datePart = String(movement?.movementDate || '').slice(0, 10);
    const timeSource = movement?.createdAt || movement?.movementDate;
    const date = datePart ? new Date(`${datePart}T00:00:00`) : null;
    const time = timeSource ? new Date(timeSource) : null;

    const formattedDate =
        date && !Number.isNaN(date.getTime())
            ? date.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
              })
            : movement?.movementDate || '';

    const formattedTime =
        time && !Number.isNaN(time.getTime())
            ? time.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '';

    return [formattedDate, formattedTime].filter(Boolean).join(' ');
};

const formatMoney = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
    });
};

const normalizeText = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const getEmployeeLabel = (employee) =>
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email ||
    'Empleado';

const paginate = (items, page) => {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;

    return {
        currentPage,
        totalPages,
        items: items.slice(start, start + pageSize),
    };
};

const Pagination = ({ page, totalPages, onChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className='warehouse-pagination'>
            <button
                type='button'
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
            >
                Anterior
            </button>
            <span>
                {page} / {totalPages}
            </span>
            <button
                type='button'
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
            >
                Siguiente
            </button>
        </div>
    );
};

const AdminWarehouseSection = () => {
    const { authToken } = useContext(AuthContext);
    const [movements, setMovements] = useState([]);
    const [stock, setStock] = useState([]);
    const [employeeStock, setEmployeeStock] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filters, setFilters] = useState({
        movementType: '',
        itemName: '',
        employeeId: '',
        fromDate: '',
        toDate: '',
    });
    const [form, setForm] = useState(initialForm);
    const [stockItemFilter, setStockItemFilter] = useState('');
    const [employeeStockFilter, setEmployeeStockFilter] = useState('');
    const [formEmployeeSearch, setFormEmployeeSearch] = useState('');
    const [stockPage, setStockPage] = useState(1);
    const [employeeStockPage, setEmployeeStockPage] = useState(1);
    const [movementPage, setMovementPage] = useState(1);
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

    const itemOptions = useMemo(() => {
        const values = new Set();
        movements.forEach((movement) => {
            if (movement.itemName) values.add(movement.itemName);
        });
        stock.forEach((item) => {
            if (item.itemName) values.add(item.itemName);
        });
        return [...values].sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );
    }, [movements, stock]);

    const filteredStock = useMemo(
        () => {
            const search = normalizeText(stockItemFilter);
            if (!search) return stock;
            return stock.filter((item) =>
                normalizeText(
                    `${item.itemName || ''} ${item.category || ''} ${
                        item.size || ''
                    }`
                ).includes(search)
            );
        },
        [stock, stockItemFilter]
    );

    const stockGroups = useMemo(() => {
        const groups = new Map();

        filteredStock.forEach((item) => {
            const key = `${item.itemName || ''}__${item.category || ''}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    itemName: item.itemName,
                    category: item.category,
                    total: 0,
                    sizes: [],
                });
            }

            const group = groups.get(key);
            group.total += Number(item.stock || 0);
            group.sizes.push(item);
        });

        return [...groups.values()];
    }, [filteredStock]);

    const availableOutItems = useMemo(
        () =>
            [...new Set(stock.map((item) => item.itemName).filter(Boolean))].sort(
                (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })
            ),
        [stock]
    );

    const employeeStockByEmployee = useMemo(() => {
        const groups = new Map();

        employeeStock.forEach((item) => {
            const key = item.employeeId || item.employeeName || 'unknown';
            if (!groups.has(key)) {
                groups.set(key, {
                    employeeId: item.employeeId,
                    employeeName: item.employeeName || 'Sin nombre',
                    items: [],
                });
            }
            groups.get(key).items.push(item);
        });

        const search = normalizeText(employeeStockFilter);
        const grouped = [...groups.values()];
        if (!search) return grouped;
        return grouped.filter((employee) =>
            normalizeText(employee.employeeName).includes(search)
        );
    }, [employeeStock, employeeStockFilter]);

    const paginatedStock = paginate(stockGroups, stockPage);
    const paginatedEmployeeStock = paginate(
        employeeStockByEmployee,
        employeeStockPage
    );
    const paginatedMovements = paginate(movements, movementPage);

    const loadWarehouse = async (nextFilters = filters) => {
        if (!authToken) return;
        try {
            setLoading(true);
            const data = await fetchWarehouse(authToken, nextFilters);
            setMovements(data.movements || []);
            setStock(data.stock || []);
            setEmployeeStock(data.employeeStock || []);
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
        setMovementPage(1);
        loadWarehouse(nextFilters);
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
            ...(name === 'movementType'
                ? {
                      employeeId: value === 'in' ? '' : prev.employeeId,
                      itemName:
                          value === 'out' &&
                          prev.itemName &&
                          !availableOutItems.includes(prev.itemName)
                              ? ''
                              : prev.itemName,
                  }
                : {}),
        }));
        if (name === 'movementType' && value === 'in') {
            setFormEmployeeSearch('');
        }
    };

    const handleFormEmployeeSearchChange = (event) => {
        const value = event.target.value;
        const match = employeeOptions.find(
            (employee) =>
                normalizeText(getEmployeeLabel(employee)) === normalizeText(value)
        );

        setFormEmployeeSearch(value);
        setForm((prev) => ({
            ...prev,
            employeeId: match ? match.id : '',
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.itemName.trim()) {
            toast.error('Indica que prenda entra o sale');
            return;
        }

        try {
            setSaving(true);
            await createWarehouseMovement(authToken, {
                ...form,
                employeeId: form.movementType === 'out' ? form.employeeId : '',
                recipientName: '',
            });
            toast.success('Movimiento guardado');
            setForm((prev) => ({
                ...initialForm,
                movementType: prev.movementType,
                movementDate: today(),
            }));
            setFormEmployeeSearch('');
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

    const handleDeleteStockItem = async (item) => {
        const detail = [item.itemName, item.category, item.size]
            .filter(Boolean)
            .join(' · ');

        if (
            !window.confirm(
                `Quieres borrar ${detail}? Se eliminaran sus movimientos de almacen.`
            )
        ) {
            return;
        }

        try {
            await deleteWarehouseStockItem(authToken, {
                itemName: item.itemName,
                category: item.category,
                size: item.size,
            });
            toast.success('Tipo de prenda borrado');
            setStockPage(1);
            await loadWarehouse();
        } catch (error) {
            toast.error(error.message || 'No se pudo borrar la prenda');
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
                            {form.movementType === 'out' ? (
                                <select
                                    name='itemName'
                                    value={form.itemName}
                                    onChange={handleFormChange}
                                >
                                    <option value=''>Selecciona prenda</option>
                                    {availableOutItems.map((itemName) => (
                                        <option key={itemName} value={itemName}>
                                            {itemName}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <>
                                    <input
                                        name='itemName'
                                        value={form.itemName}
                                        onChange={handleFormChange}
                                        list='warehouse-item-options'
                                        placeholder='Camisa, pantalon, chaqueta...'
                                    />
                                    <datalist id='warehouse-item-options'>
                                        {itemOptions.map((itemName) => (
                                            <option
                                                key={itemName}
                                                value={itemName}
                                            />
                                        ))}
                                    </datalist>
                                </>
                            )}
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
                        {form.movementType === 'out' ? (
                            <label>
                                Trabajador
                                <input
                                    value={formEmployeeSearch}
                                    onChange={handleFormEmployeeSearchChange}
                                    list='warehouse-employee-options'
                                    placeholder='Busca por nombre...'
                                />
                                <datalist id='warehouse-employee-options'>
                                    {employeeOptions.map((employee) => (
                                        <option
                                            key={employee.id}
                                            value={getEmployeeLabel(employee)}
                                        />
                                    ))}
                                </datalist>
                            </label>
                        ) : null}
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

                <div className='warehouse-side'>
                <aside className='warehouse-card warehouse-stock'>
                    <div className='warehouse-stock-header'>
                        <h3>Stock actual</h3>
                        <input
                            value={stockItemFilter}
                            onChange={(event) =>
                                {
                                    setStockItemFilter(event.target.value);
                                    setStockPage(1);
                                }
                            }
                            placeholder='Buscar prenda, talla...'
                        />
                    </div>
                    {filteredStock.length ? (
                        <div className='warehouse-stock-list'>
                            {paginatedStock.items.map((group) => (
                                <details
                                    key={`${group.itemName}-${group.category}`}
                                    className='warehouse-stock-group'
                                >
                                    <summary>
                                        <div>
                                            <strong>{group.itemName}</strong>
                                            <span>{group.category || 'Sin categoria'}</span>
                                        </div>
                                        <strong>{group.total}</strong>
                                    </summary>
                                    <div className='warehouse-stock-size-list'>
                                        {group.sizes.map((item) => (
                                            <article
                                                key={`${item.itemName}-${item.category}-${item.size}`}
                                                className='warehouse-stock-size'
                                            >
                                                <span>Talla: <strong>{item.size || '-'}</strong></span>
                                                <span>Cantidad: <strong>{Number(item.stock || 0)}</strong></span>
                                                <button
                                                    type='button'
                                                    onClick={() => handleDeleteStockItem(item)}
                                                >
                                                    Borrar
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                </details>
                            ))}
                            <Pagination
                                page={paginatedStock.currentPage}
                                totalPages={paginatedStock.totalPages}
                                onChange={setStockPage}
                            />
                        </div>
                    ) : (
                        <p className='warehouse-empty'>
                            Sin stock registrado para ese filtro.
                        </p>
                    )}
                </aside>

                <aside className='warehouse-card warehouse-stock'>
                    <div className='warehouse-stock-header'>
                        <h3>Ropa en trabajadores</h3>
                        <input
                            value={employeeStockFilter}
                            onChange={(event) => {
                                setEmployeeStockFilter(event.target.value);
                                setEmployeeStockPage(1);
                            }}
                            placeholder='Buscar trabajador...'
                        />
                    </div>
                    {employeeStockByEmployee.length ? (
                        <div className='warehouse-employee-stock-list'>
                            {paginatedEmployeeStock.items.map((employee) => (
                                <article
                                    key={employee.employeeId || employee.employeeName}
                                    className='warehouse-employee-stock'
                                >
                                    <strong>{employee.employeeName}</strong>
                                    <div>
                                        {employee.items.map((item) => (
                                            <span
                                                key={`${item.itemName}-${item.category}-${item.size}`}
                                            >
                                                {Number(item.quantity || 0)} x{' '}
                                                {item.itemName}
                                                {[item.category, item.size].filter(
                                                    Boolean
                                                ).length
                                                    ? ` (${[
                                                          item.category,
                                                          item.size,
                                                      ]
                                                          .filter(Boolean)
                                                          .join(' · ')})`
                                                    : ''}
                                            </span>
                                        ))}
                                    </div>
                                </article>
                            ))}
                            <Pagination
                                page={paginatedEmployeeStock.currentPage}
                                totalPages={paginatedEmployeeStock.totalPages}
                                onChange={setEmployeeStockPage}
                            />
                        </div>
                    ) : (
                        <p className='warehouse-empty'>
                            No hay ropa entregada a trabajadores.
                        </p>
                    )}
                </aside>
                </div>
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
                                <th>Trabajador</th>
                                <th>Notas</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMovements.items.map((movement) => (
                                <tr key={movement.id}>
                                    <td>{formatMovementDateTime(movement)}</td>
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
                                        {movement.employeeName || '-'}
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
                <Pagination
                    page={paginatedMovements.currentPage}
                    totalPages={paginatedMovements.totalPages}
                    onChange={setMovementPage}
                />
            </section>
        </section>
    );
};

export default AdminWarehouseSection;
