import './ListServiceComponent.css';
import { useEffect, useState } from 'react';
import { fetchAllTypeOfServicesServices } from '../../../services/typeOfServiceService.js';
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';

const ListServicesComponent = () => {
    const [data, setData] = useState([]);
    const [city, setCity] = useState('');
    const [type, setType] = useState('');

    const resetFilters = (e) => {
        e.preventDefault();
        setCity('');
        setType('');
    };

    useEffect(() => {
        const getTypeOfServices = async () => {
            const searchParams = new URLSearchParams({
                city: city,
                type: type,
            });
            const searchParamsToString = searchParams.toString();
            try {
                const data =
                    await fetchAllTypeOfServicesServices(searchParamsToString);
                setData(data);
            } catch (error) {
                toast.error(error.message, {
                    id: 'error',
                });
            }
        };

        getTypeOfServices();
    }, [city, type]);

    const citiesNoRepeated = [...new Set(data.map((item) => item.city))].sort();
    const typeNoRepeated = [...new Set(data.map((item) => item.type))].sort();

    return (
        <>
            <form className='mx-auto form-filters'>
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
                    {citiesNoRepeated.map((city) => {
                        return (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        );
                    })}
                </select>
                <select
                    name='typeOfService'
                    id='typeOfService'
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                    }}
                >
                    <option value='' disabled>
                        Tipo de Servicio:
                    </option>
                    {typeNoRepeated.map((type) => {
                        return (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        );
                    })}
                </select>                <button onClick={resetFilters}>Limpiar Filtros</button>
            </form>
            <ul className='cards'>
                {data.map((item) => {
                    return (
                        <li id={item.id} key={item.id}>
                            <h3>{item.type}</h3>

                            <p className='grow'>{item.description}</p>

                            <p className='font-extrabold'>{item.city}</p>


                            <NavLink
                                className='mb-4'
                                to={`/typeOfServices/edit/${item.id}`}
                            >
                                Editar
                            </NavLink>
                            <NavLink
                                className='mb-4'
                                to={`/typeOfServices/createcontract/${item.id}`}
                            >
                                Nuevo Contrato
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

export default ListServicesComponent;
