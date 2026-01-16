import { NavLink } from 'react-router-dom';
import './Card.css';

const Card = ({ image, title, city, link }) => {
    return (
        <li className='card'>
            <div className='card-image-wrapper'>
                <img src={image} alt={title} className='card-image' />
            </div>

            <div className='card-body'>
                <h3 className='card-title'>{title}</h3>

                {/* CITY */}
                <p className='card-city'>{city}</p>


                {/* LINK */}
                <NavLink to={link} className='card-link'>
                    Infórmate
                </NavLink>
            </div>
        </li>
    );
};

export default Card;
