import './FloatingCallButton.css';
import { FaWhatsapp } from 'react-icons/fa';

export default function FloatingWhatsAppButton() {
    return (
        <a
            href='https://wa.me/34644185486' // ← CAMBIA AQUÍ TU NÚMERO
            target='_blank'
            rel='noopener noreferrer'
            className='floating-whatsapp-btn'
        >
            <FaWhatsapp size={26} />
        </a>
    );
}
