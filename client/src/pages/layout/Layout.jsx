import './Layout.css';
import { useLocation } from 'react-router-dom';
import Header from './Header/Header';
import Footer from './Footer/Footer';
import FloatingCallButton from '../../components/floatingCallButton/FloatingCallButton';

const Layout = ({ children }) => {
    const location = useLocation();
    const showWhatsapp = location.pathname === '/';
    return (
        <div className='layout'>
            <Header />
            <main className='pages'>{children}</main>
            {showWhatsapp ? <FloatingCallButton /> : null}
            <Footer />
        </div>
    );
};

export default Layout;
