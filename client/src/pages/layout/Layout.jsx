import './Layout.css';
import Header from './Header/Header';
import Footer from './Footer/Footer';
import FloatingCallButton from '../../components/floatingCallButton/FloatingCallButton';

const Layout = ({ children }) => {
    return (
        <div className='layout'>
            <Header />
            <main className='pages'>{children}</main>
            <FloatingCallButton />
            <Footer />
        </div>
    );
};

export default Layout;
