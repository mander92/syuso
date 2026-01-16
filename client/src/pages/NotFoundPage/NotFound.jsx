import { NavLink } from 'react-router-dom';
import Button from '../../components/button/Button';
import './NotFound.css';

const NotFound = () => {
    return (
        <div className='notfound-wrapper'>
            <div className='notfound-card'>
                <h1 className='notfound-title'>404</h1>
                <h2 className='notfound-subtitle'>Página no encontrada</h2>
                <p className='notfound-text'>
                    Lo sentimos, la página que estás buscando no existe o ha
                    sido movida.
                </p>

                <div className='notfound-actions'>
                    <NavLink to='/'>
                        <Button variant='btn btn-primary'>
                            Volver al inicio
                        </Button>
                    </NavLink>

                    <NavLink to='/login'>
                        <Button variant='btn btn-secondary'>Ir al login</Button>
                    </NavLink>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
