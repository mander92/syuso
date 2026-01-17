import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import './AdminCleanupSection.css';

const cleanupOptions = [
    { value: 'workReportsPdfs', label: 'Partes PDF' },
    { value: 'workReportsPhotos', label: 'Fotos partes' },
    { value: 'workReportsReports', label: 'Imagenes partes' },
    { value: 'workReportsSignatures', label: 'Firmas partes' },
    { value: 'workReportsDrafts', label: 'Borradores partes' },
    { value: 'serviceChat', label: 'Adjuntos chat' },
    { value: 'schedules', label: 'Cuadrantes' },
    { value: 'documents', label: 'Documentos Excel' },
    { value: 'cv', label: 'CVs' },
];

const AdminCleanupSection = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [type, setType] = useState('workReportsPdfs');
    const [beforeDate, setBeforeDate] = useState('');
    const [isCleaning, setIsCleaning] = useState(false);
    const [result, setResult] = useState(null);
    const [storage, setStorage] = useState(null);

    const loadStorage = async () => {
        if (!authToken) return;
        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/storage`,
                {
                    headers: {
                        Authorization: authToken,
                    },
                }
            );
            const body = await res.json();
            if (!res.ok || body.status === 'error') {
                throw new Error(body.message || 'No se pudo leer la memoria');
            }
            setStorage(body.data);
        } catch (error) {
            toast.error(error.message || 'No se pudo leer la memoria');
        }
    };

    useEffect(() => {
        if (user?.role !== 'sudo') return;
        loadStorage();
    }, [authToken, user]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!beforeDate) {
            toast.error('Selecciona una fecha');
            return;
        }

        try {
            setIsCleaning(true);
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/cleanup`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: authToken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ type, beforeDate }),
                }
            );

            const body = await res.json();
            if (!res.ok || body.status === 'error') {
                throw new Error(body.message || 'No se pudo limpiar');
            }

            setResult(body.data);
            await loadStorage();
            toast.success('Limpieza completada');
        } catch (error) {
            toast.error(error.message || 'No se pudo limpiar');
        } finally {
            setIsCleaning(false);
        }
    };

    if (user?.role !== 'sudo') return null;

    const usedPercent = storage
        ? Math.min(100, Math.round((storage.used / storage.size) * 100))
        : 0;

    return (
        <section className='cleanup'>
            <div className='cleanup-header'>
                <div>
                    <h1>Limpieza de archivos</h1>
                    <p>Elimina archivos antiguos para liberar espacio.</p>
                </div>
            </div>

            {storage && (
                <div className='cleanup-storage'>
                    <div className='cleanup-storage-row'>
                        <strong>Disco</strong>
                        <span>{usedPercent}% usado</span>
                    </div>
                    <div className='cleanup-storage-bar'>
                        <div
                            className='cleanup-storage-bar-fill'
                            style={{ width: `${usedPercent}%` }}
                        />
                    </div>
                    <p className='cleanup-storage-meta'>
                        {(storage.used / 1024 / 1024 / 1024).toFixed(2)} GB
                        usados de{' '}
                        {(storage.size / 1024 / 1024 / 1024).toFixed(2)} GB
                    </p>
                </div>
            )}

            <form className='cleanup-form' onSubmit={handleSubmit}>
                <div className='cleanup-field'>
                    <label htmlFor='cleanup-type'>Tipo</label>
                    <select
                        id='cleanup-type'
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                    >
                        {cleanupOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='cleanup-field'>
                    <label htmlFor='cleanup-date'>Eliminar antes de</label>
                    <input
                        id='cleanup-date'
                        type='date'
                        value={beforeDate}
                        onChange={(event) => setBeforeDate(event.target.value)}
                    />
                </div>
                <button className='cleanup-btn' type='submit' disabled={isCleaning}>
                    {isCleaning ? 'Limpiando...' : 'Limpiar'}
                </button>
            </form>

            {result && (
                <div className='cleanup-result'>
                    <p>
                        Eliminados: {result.deleted} archivos (
                        {(result.bytes / 1024 / 1024).toFixed(2)} MB)
                    </p>
                </div>
            )}
        </section>
    );
};

export default AdminCleanupSection;
