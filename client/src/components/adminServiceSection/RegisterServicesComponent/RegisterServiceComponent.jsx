import './RegisterServiceComponent.css';
import { useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { fetchNewTypeOfServiceServices } from '../../../services/typeOfServiceService.js';
import toast from 'react-hot-toast';

const RegisterNewTypeOfServiceController = () => {
    const { authToken } = useContext(AuthContext);

    const [type, setType] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [image, setImage] = useState(null);

    const resetInputs = (e) => {
        e.preventDefault();
        setType('');
        setDescription('');
        setCity('');
    };

    const handleRegisterNewTypeOfService = async (e) => {
        e.preventDefault();
        try {
            const data = await fetchNewTypeOfServiceServices(
                type,
                description,
                city,
                image,
                authToken
            );

            toast.success(data.message, {
                id: 'ok',
            });
            resetInputs(e);
        } catch (error) {
            toast.error(error.message, {
                id: 'error',
            });
        }
    };

    return (
        <form className='mx-auto'>
            <fieldset>
                <legend>Tipo de servicio</legend>
                <label htmlFor='type'>Tipo</label>
                <input
                    required
                    id='type'
                    type='text'
                    placeholder='Escribe aquí el tipo de servicio'
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                    }}
                />
                <label htmlFor='city'>Ciudad</label>
                <input
                    required
                    id='city'
                    type='text'
                    value={city}
                    onChange={(e) => {
                        setCity(e.target.value);
                    }}
                    placeholder='Escribe aquí la ciudad'
                />                <div className='mx-auto'>
                    <button
                        className='mr-4'
                        onClick={handleRegisterNewTypeOfService}
                    >
                        Registrar
                    </button>
                    <button onClick={resetInputs}>Limpiar</button>
                </div>
            </fieldset>
        </form>
    );
};

export default RegisterNewTypeOfServiceController;
