import { useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchDeleteShiftRecord,
    fetchShiftRecordDetail,
    fetchUpdateShiftRecord,
} from '../../services/shiftRecordService.js';
import './ShiftDetail.css';

const ShiftDetail = () => {
    const { shiftRecordId } = useParams();
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();

    const [shift, setShift] = useState(null);
    const [clockIn, setClockIn] = useState('');
    const [clockOut, setClockOut] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadShift = async () => {
            if (!authToken || !shiftRecordId) return;

            try {
                setIsLoading(true);
                const data = await fetchShiftRecordDetail(
                    shiftRecordId,
                    authToken
                );
                setShift(data);
                setClockIn(data?.clockIn ? data.clockIn.slice(0, 16) : '');
                setClockOut(data?.clockOut ? data.clockOut.slice(0, 16) : '');
            } catch (error) {
                toast.error(error.message || 'No se pudo cargar el turno');
            } finally {
                setIsLoading(false);
            }
        };

        loadShift();
    }, [authToken, shiftRecordId]);

    if (!authToken) return <Navigate to='/login' />;

    if (user && user.role !== 'admin' && user.role !== 'sudo') {
        return (
            <div className='shift-detail-page'>
                <div className='shift-detail-card'>
                    <h2>Acceso restringido</h2>
                    <p>Solo administradores pueden editar turnos.</p>
                    <NavLink className='shift-detail-back' to='/account'>
                        Volver al panel
                    </NavLink>
                </div>
            </div>
        );
    }

    const handleSave = async (e) => {
        e.preventDefault();

        if (!clockIn || !clockOut) {
            toast.error('Debes indicar entrada y salida');
            return;
        }

        try {
            const normalizeDateTime = (value) => {
                const [datePart, timePart] = value.split('T');
                return `${datePart} ${timePart}:00`;
            };

            setIsSaving(true);
            const body = await fetchUpdateShiftRecord(
                shiftRecordId,
                authToken,
                normalizeDateTime(clockIn),
                normalizeDateTime(clockOut)
            );
            toast.success(body.message || 'Turno actualizado');
        } catch (error) {
            toast.error(error.message || 'No se pudo guardar el turno');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Seguro que quieres eliminar este turno?')) return;

        try {
            setIsSaving(true);
            const body = await fetchDeleteShiftRecord(
                shiftRecordId,
                authToken
            );
            toast.success(body.message || 'Turno eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el turno');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className='shift-detail-page'>
            <div className='shift-detail-header'>
                <div>
                    <h1>Editar turno</h1>
                    <p>Ajusta la hora de entrada y salida.</p>
                </div>
                <NavLink className='shift-detail-back' to='/account'>
                    Volver al panel
                </NavLink>
            </div>

            {isLoading ? (
                <div className='shift-detail-card'>
                    <p>Cargando turno...</p>
                </div>
            ) : !shift ? (
                <div className='shift-detail-card'>
                    <p>No se encontro el turno solicitado.</p>
                </div>
            ) : (
                <form className='shift-detail-card' onSubmit={handleSave}>
                    <label htmlFor='clockIn'>Entrada</label>
                    <input
                        id='clockIn'
                        type='datetime-local'
                        value={clockIn}
                        onChange={(e) => setClockIn(e.target.value)}
                        required
                    />
                    <label htmlFor='clockOut'>Salida</label>
                    <input
                        id='clockOut'
                        type='datetime-local'
                        value={clockOut}
                        onChange={(e) => setClockOut(e.target.value)}
                        required
                    />
                    <div className='shift-detail-actions'>
                        <button type='submit' disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button
                            type='button'
                            className='shift-detail-delete'
                            onClick={handleDelete}
                            disabled={isSaving}
                        >
                            Eliminar turno
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ShiftDetail;
