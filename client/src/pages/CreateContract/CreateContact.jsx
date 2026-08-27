import { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import SalaryRateModal, {
    emptyRateForm,
} from '../../components/salarySettlements/SalaryRateModal.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { saveSalaryRate } from '../../services/salarySettlementService.js';
import { fetchNewContractAdmin } from '../../services/serviceService.js';

const CreateContract = () => {
    const { authToken } = useContext(AuthContext);
    const { typeOfServiceId } = useParams();

    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [numberOfPeople, setNumberOfPeople] = useState('');
    const [comments, setComments] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [postCode, setPostCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [description, setDescription] = useState('');
    const [province, setProvince] = useState('');
    const [autonomousCommunity, setAutonomousCommunity] = useState('');
    const [hourRuleType, setHourRuleType] = useState('standard');
    const [configureRate, setConfigureRate] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [rateForm, setRateForm] = useState({
        ...emptyRateForm,
        payMode: 'agreement',
        amountType: 'gross',
    });

    const formatDate = (dateTime) => dateTime?.replace('T', ' ') || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formattedStartDateTime = formatDate(startDateTime);
        const formattedEndDateTime = formatDate(endDateTime) || null;

        try {
            const res = await fetchNewContractAdmin(
                authToken,
                typeOfServiceId || '',
                formattedStartDateTime,
                formattedEndDateTime,
                '',
                numberOfPeople,
                comments,
                address,
                city,
                postCode,
                '',
                name,
                type,
                description,
                province,
                autonomousCommunity,
                hourRuleType
            );

            const createdServiceId = res?.data?.id;
            if (configureRate && createdServiceId) {
                await saveSalaryRate(authToken, {
                    ...rateForm,
                    serviceId: createdServiceId,
                    employeeId: '',
                    amountType:
                        rateForm.payMode === 'agreement'
                            ? 'gross'
                            : rateForm.amountType,
                });
            }

            toast.success(res.message);
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <>
            <form className='profile-form mx-auto' onSubmit={handleSubmit}>
                <fieldset>
                    <label htmlFor='name'>Nombre</label>
                    <input
                        type='text'
                        id='name'
                        name='name'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <label htmlFor='type'>Tipo de servicio</label>
                    <input
                        required
                        type='text'
                        id='type'
                        name='type'
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    />
                    <label htmlFor='province'>Delegacion</label>
                    <input
                        required
                        type='text'
                        id='province'
                        name='province'
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                    />
                    <label htmlFor='autonomousCommunity'>Comunidad autonoma</label>
                    <input
                        type='text'
                        id='autonomousCommunity'
                        name='autonomousCommunity'
                        value={autonomousCommunity}
                        onChange={(e) => setAutonomousCommunity(e.target.value)}
                        placeholder='Ej. Andalucia'
                    />
                    <label htmlFor='hourRuleType'>Computo de horas</label>
                    <select
                        id='hourRuleType'
                        name='hourRuleType'
                        value={hourRuleType}
                        onChange={(e) => setHourRuleType(e.target.value)}
                    >
                        <option value='standard'>Normal</option>
                        <option value='convenio'>Convenio</option>
                    </select>
                    <label htmlFor='description'>Descripcion</label>
                    <input
                        type='text'
                        id='description'
                        name='description'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <label htmlFor='startDateTime'>Fecha de inicio</label>
                    <input
                        type='datetime-local'
                        id='startDateTime'
                        name='startDateTime'
                        value={startDateTime}
                        onChange={(e) => setStartDateTime(e.target.value)}
                    />
                    <label htmlFor='endDateTime'>Fecha de fin</label>
                    <input
                        type='datetime-local'
                        id='endDateTime'
                        name='endDateTime'
                        value={endDateTime}
                        onChange={(e) => setEndDateTime(e.target.value)}
                    />
                    <label htmlFor='NumberOfPeople'>Numero de personas</label>
                    <input
                        type='number'
                        min={1}
                        id='NumberOfPeople'
                        name='NumberOfPeople'
                        value={numberOfPeople}
                        onChange={(e) => setNumberOfPeople(e.target.value)}
                    />
                    <label htmlFor='comments'>Comentarios</label>
                    <input
                        type='text'
                        id='comments'
                        name='comments'
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                    <label htmlFor='Address'>Direccion</label>
                    <input
                        type='text'
                        id='Address'
                        name='Address'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                    <label htmlFor='city'>Ciudad</label>
                    <input
                        type='text'
                        id='city'
                        name='city'
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                    />
                    <label htmlFor='PostCode'>Codigo Postal</label>
                    <input
                        type='number'
                        id='PostCode'
                        name='PostCode'
                        value={postCode}
                        onChange={(e) => setPostCode(e.target.value)}
                    />
                    <label htmlFor='configureRate'>
                        <input
                            id='configureRate'
                            type='checkbox'
                            checked={configureRate}
                            onChange={(e) => setConfigureRate(e.target.checked)}
                        />
                        Configurar tarifa general del servicio
                    </label>
                    {configureRate ? (
                        <button
                            type='button'
                            onClick={() => setIsRateModalOpen(true)}
                        >
                            Editar tarifa
                        </button>
                    ) : null}
                    <button>Enviar</button>
                </fieldset>
            </form>
            <SalaryRateModal
                open={isRateModalOpen}
                title='Tarifa general del servicio'
                form={rateForm}
                onChange={setRateForm}
                onClose={() => setIsRateModalOpen(false)}
                onSubmit={(event) => {
                    event.preventDefault();
                    setIsRateModalOpen(false);
                }}
                serviceOptions={[{ id: '', name: 'Servicio nuevo' }]}
                hideEmployee
                lockService
            />
        </>
    );
};

export default CreateContract;
