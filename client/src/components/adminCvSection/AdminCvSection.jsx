import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import './AdminCvSection.css';

const AdminCvSection = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [applications, setApplications] = useState([]);
    const [preview, setPreview] = useState(null);

    const loadApplications = async () => {
        if (!authToken) return;
        try {
            setLoading(true);
            const params = buildQueryParams();
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/jobs/applications?${params.toString()}`,
                {
                    headers: { Authorization: authToken },
                }
            );
            const body = await res.json();
            if (!res.ok || body.status === 'error') {
                throw new Error(body.message || 'No se pudo cargar');
            }
            setApplications(body.data || []);
        } catch (error) {
            toast.error(error.message || 'No se pudo cargar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'sudo') return;
        loadApplications();
    }, [authToken, user, search, startDate, endDate]);

    const buildQueryParams = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search.trim());
        if (startDate && endDate) {
            params.append('startDate', startDate);
            params.append('endDate', endDate);
        }
        return params;
    };

    const handleZipDownload = async () => {
        if (!authToken) return;
        try {
            setDownloading(true);
            const params = buildQueryParams();
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/jobs/applications/zip?${params.toString()}`,
                {
                    headers: { Authorization: authToken },
                }
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || 'No se pudo descargar');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cvs_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(error.message || 'No se pudo descargar');
        } finally {
            setDownloading(false);
        }
    };

    const openPreview = (item) => {
        if (!item?.cvFile) return;
        const fileUrl = `${import.meta.env.VITE_API_URL}/uploads/${item.cvFile}`;
        const extension = item.cvFile.split('.').pop()?.toLowerCase();
        const isPdf = extension === 'pdf';
        const previewUrl = isPdf
            ? fileUrl
            : `https://docs.google.com/gview?url=${encodeURIComponent(
                  fileUrl
              )}&embedded=true`;
        setPreview({
            title: item.fullName || 'CV',
            url: previewUrl,
        });
    };

    if (user?.role !== 'sudo') return null;

    return (
        <section className='cv-section'>
            <div className='cv-header'>
                <div>
                    <h1>CV recibidos</h1>
                    <p>Filtra y descarga curriculos.</p>
                </div>
            </div>

            <form className='cv-filters' onSubmit={(e) => e.preventDefault()}>
                <div className='cv-filter'>
                    <label htmlFor='cv-search'>Buscar</label>
                    <input
                        id='cv-search'
                        type='text'
                        placeholder='Nombre, email o telefono'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className='cv-filter'>
                    <label htmlFor='cv-start'>Desde</label>
                    <input
                        id='cv-start'
                        type='date'
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className='cv-filter'>
                    <label htmlFor='cv-end'>Hasta</label>
                    <input
                        id='cv-end'
                        type='date'
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <button
                    type='button'
                    className='cv-btn'
                    onClick={loadApplications}
                    disabled={loading}
                >
                    {loading ? 'Cargando...' : 'Aplicar'}
                </button>
                <button
                    type='button'
                    className='cv-btn cv-btn--ghost'
                    onClick={handleZipDownload}
                    disabled={downloading || !applications.length}
                >
                    {downloading ? 'Descargando...' : 'Descargar zip'}
                </button>
            </form>

            {loading ? (
                <p className='cv-loading'>Cargando CVs...</p>
            ) : applications.length ? (
                <div className='cv-list'>
                    {applications.map((item) => (
                        <article key={item.id} className='cv-card'>
                            <div>
                                <h3>{item.fullName}</h3>
                                <p>{item.email}</p>
                                <p>{item.phone}</p>
                                <p>
                                    {item.createdAt
                                        ? new Date(
                                              item.createdAt
                                          ).toLocaleString()
                                        : ''}
                                </p>
                            </div>
                            <div className='cv-actions'>
                                <button
                                    type='button'
                                    className='cv-btn'
                                    onClick={() => openPreview(item)}
                                >
                                    Ver CV
                                </button>
                                <a
                                    className='cv-btn cv-btn--ghost'
                                    href={`${import.meta.env.VITE_API_URL}/uploads/${item.cvFile}`}
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    Descargar CV
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <p className='cv-loading'>No hay CVs.</p>
            )}

            {preview ? (
                <div className='cv-preview-overlay'>
                    <div className='cv-preview-modal'>
                        <div className='cv-preview-header'>
                            <h3>{preview.title}</h3>
                            <button
                                type='button'
                                className='cv-btn cv-btn--ghost'
                                onClick={() => setPreview(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='cv-preview-frame'>
                            <iframe
                                title={preview.title}
                                src={preview.url}
                                frameBorder='0'
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default AdminCvSection;
