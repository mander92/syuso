import './App.css';

import { Routes, Route } from 'react-router-dom';

import Layout from './pages/layout/Layout';

import Home from './pages/Home/HomePage';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ValidateUser from './pages/ValidateUser/ValidateUser';
import TypeOfServiceDetail from './pages/typeOfServiceDetail/TypeOfServiceDetail';
import TypeOfServiceEdit from './pages/typeOfServiceEdit/TypeOfServiceEdit';
import RecoverPassword from './pages/RecoverPassword/RecoverPassword';
import Consulting from './pages/consulting/Consulting';
import ServiceContact from './pages/serviceContact/ServiceContact';
import Work from './pages/work/Work';
import DashboardComponent from './components/dashboardComponent/DashboardComponent';
import CreateContract from './pages/CreateContract/CreateContact';
import ServiceDetail from './pages/serviceDetail/ServiceDetail';
import ShiftDetail from './pages/ShiftDetail/ShiftDetail';
import ShiftCreate from './pages/ShiftCreate/ShiftCreate';
import WorkReport from './pages/WorkReport/WorkReport';

import NotFound from './pages/NotFoundPage/NotFound';

const App = () => {
    return (
        <Layout>
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route
                    path='/users/validate/:registrationCode'
                    element={<ValidateUser />}
                />
                <Route path='/recoverpassword' element={<RecoverPassword />} />
                <Route path='/services/:serviceId' element={<ServiceDetail />} />
                <Route
                    path='/shiftRecords/:shiftRecordId'
                    element={<ShiftDetail />}
                />
                <Route
                    path='/shiftRecords/create'
                    element={<ShiftCreate />}
                />
                <Route
                    path='/shiftRecords/:shiftRecordId/report'
                    element={<WorkReport />}
                />
                <Route path='/consulting' element={<Consulting />} />
                <Route
                    path='/contact/:serviceKey'
                    element={<ServiceContact />}
                />
                <Route path='/work' element={<Work />} />
                <Route path='/account' element={<DashboardComponent />} />

                <Route
                    path='/typeOfServices/edit/:id'
                    element={<TypeOfServiceEdit />}
                />

                <Route
                    path='/typeOfServices/:id'
                    element={<TypeOfServiceDetail />}
                />

                <Route
                    path='/typeOfServices/createcontract/:typeOfServiceId'
                    element={<CreateContract />}
                />

                <Route path='*' element={<NotFound />} />
            </Routes>
        </Layout>
    );
};

export default App;



