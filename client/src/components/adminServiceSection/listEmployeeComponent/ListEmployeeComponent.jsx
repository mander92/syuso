// src/components/....../ListEmployeeComponent.jsx
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { fetchAllUsersServices } from '../../../services/userService.js'; // ojo al nombre del archivo
import { fetchAssingNewEmployeeSevice } from '../../../services/personAssigned.js';
import { buildImageUrl } from '../../../utils/imageUrl.js';

const ListEmployeeComponent = ({
    serviceId,
    numberOfPeople,
    employeeData,
    setEmployeeData,
    onAssigned,
}) => {
    const { authToken } = useContext(AuthContext);

    const role = 'employee';

    const [data, setData] = useState([]);
    const [active, setActive] = useState('1');
    const [job, setJob] = useState('');
    const [city, setCity] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const getAllUserList = async () => {
            const searchParams = new URLSearchParams({
                city,
                job,
                role,
                active,
            });
            const searchParamsToString = searchParams.toString();
            try {
                const data = await fetchAllUsersServices(
                    searchParamsToString,
                    authToken
                );
                setData(data);
            } catch (error) {
                toast.error(error.message, {
                    id: 'error',
                });
            }
        };

        getAllUserList();
    }, [city, job, active, authToken]);

    const resetFilters = (e) => {
        e.preventDefault();
        setActive('1');
        setCity('');
        setJob('');
    };

    const assingEmployee = async (serviceId, employeeId, authToken) => {
        try {
            const data = await fetchAssingNewEmployeeSevice(
                serviceId,
                employeeId,
                authToken
            );
            toast.success('Empleado asignado');
            if (typeof onAssigned === 'function') {
                onAssigned(employeeId);
            }
            return data;
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleclick = (dataEmployee) => {
        const maxEmployees = Number(numberOfPeople) || 1;
        const isActiveEmployee =
            dataEmployee?.active === 1 || dataEmployee?.active === true;

        if (!isActiveEmployee) {
            toast.error('El empleado esta inactivo');
            return;
        }

        if (employeeData.length < maxEmployees) {
            const employeeExists = employeeData.some(
                (empleado) => empleado.id === dataEmployee.id
            );
            if (employeeExists) {
                toast.error('El empleado ya se encuentra asignado');
                return;
            } else {
                setEmployeeData((prev) => [...prev, dataEmployee]);
                assingEmployee(serviceId, dataEmployee.id, authToken);
            }
        } else {
            toast.error(
                'El número máximo de empleados asignado a este servicio ha sido alcanzado'
            );
        }
    };

    const citiesNoRepeated = [...new Set(data.map((item) => item.city))].sort(
        (a, b) => a.localeCompare(b)
    );
    const jobNoRepeated = [...new Set(data.map((item) => item.job))].sort(
        (a, b) => a.localeCompare(b)
    );

    const filteredData = data.filter((item) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
        return fullName.includes(term);
    });

    return (
        <>
            <form className='mx-auto form-filters'>
                <input
                    type='text'
                    placeholder='Buscar por nombre'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    name='city'
                    id='city'
                    value={city}
                    onChange={(e) => {
                        setCity(e.target.value);
                    }}
                >
                    <option value='' disabled>
                        Ciudad:
                    </option>
                    {citiesNoRepeated.map((cityOption) => {
                        return (
                            <option key={cityOption} value={cityOption}>
                                {cityOption}
                            </option>
                        );
                    })}
                </select>

                <select
                    name='job'
                    id='job'
                    value={job}
                    onChange={(e) => {
                        setJob(e.target.value);
                    }}
                >
                    <option value='' disabled>
                        Trabajo:
                    </option>
                    {jobNoRepeated.map((jobOption) => {
                        return (
                            <option key={jobOption} value={jobOption}>
                                {jobOption}
                            </option>
                        );
                    })}
                </select>

                <select
                    name='active'
                    id='active'
                    value={active}
                    onChange={(e) => {
                        setActive(e.target.value);
                    }}
                >
                    <option value='' disabled>
                        Activo:
                    </option>
                    <option value='1'>Activo</option>
                    <option value='0'>Desactivado</option>
                </select>
                <button onClick={resetFilters}>Limpiar Filtros</button>
            </form>

            <ul className='cards'>
                {filteredData.map((item) => {
                    return (
                        <li key={item.id}>
                            <img
                                src={
                                    item.avatar
                                        ? buildImageUrl(item.avatar)
                                        : '/default-avatar.png'
                                }
                                alt='Avatar'
                            />
                            <h3>
                                👤 {item.firstName} {item.lastName}
                            </h3>
                            <p>✉️ {item.email}</p>
                            <p>📞 {item.phone}</p>
                            <p>🪪 {item.dni}</p>
                            <p>👨‍💻 {item.job}</p>
                            <p>🏠 {item.city}</p>

                            <button
                                onClick={() => {
                                    handleclick(item);
                                }}
                                disabled={
                                    !(item?.active === 1 || item?.active === true)
                                }
                            >
                                {(item?.active === 1 || item?.active === true)
                                    ? 'Asignar Empleado'
                                    : 'Empleado inactivo'}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

export default ListEmployeeComponent;
