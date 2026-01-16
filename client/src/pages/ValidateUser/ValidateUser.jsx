import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchActiveUserServices } from '../../services/userService.js';
import toast from 'react-hot-toast';
import './ValidateUser.css';

const ValidateUser = () => {
    const navigate = useNavigate();
    const { registrationCode } = useParams();

    useEffect(() => {
        const activateUser = async () => {
            try {
                const data = await fetchActiveUserServices(registrationCode);

                toast.success(data || 'Cuenta activada correctamente', {
                    id: 'ok',
                });

                navigate('/login');
            } catch (error) {
                toast.error(
                    error.message || 'No se ha podido activar la cuenta',
                    {
                        id: 'error',
                    }
                );

                navigate('/login');
            }
        };

        if (registrationCode) {
            activateUser();
        } else {
            toast.error('Código de activación no válido', { id: 'no-code' });
            navigate('/login');
        }
    }, [registrationCode, navigate]);

    return (
        <div className='validate-wrapper'>
            <div className='validate-card'>
                <h1 className='validate-title'>Validando tu cuenta…</h1>
                <p className='validate-subtitle'>
                    Estamos activando tu usuario. Serás redirigido en unos
                    segundos.
                </p>
                <div className='validate-spinner' />
            </div>
        </div>
    );
};

export default ValidateUser;
