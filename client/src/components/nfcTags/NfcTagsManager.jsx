import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    createServiceNfcTag,
    deleteServiceNfcTag,
    fetchServiceNfcTags,
} from '../../services/nfcService.js';
import './NfcTagsManager.css';

const decodeTextRecord = (record) => {
    try {
        if (typeof record.data === 'string') {
            return record.data;
        }

        if (record.data instanceof DataView) {
            const status = record.data.getUint8(0);
            const langLength = status & 0x3f;
            const encoding = status & 0x80 ? 'utf-16' : 'utf-8';
            const textBytes = new Uint8Array(
                record.data.buffer,
                record.data.byteOffset + 1 + langLength,
                record.data.byteLength - 1 - langLength
            );
            return new TextDecoder(encoding).decode(textBytes);
        }
    } catch (error) {
        return '';
    }
    return '';
};

const NfcTagsManager = ({ serviceId }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagUid, setTagUid] = useState('');
    const [lastRead, setLastRead] = useState('');

    const nfcSupported = useMemo(
        () => typeof window !== 'undefined' && 'NDEFReader' in window,
        []
    );

    const loadTags = async () => {
        if (!authToken || !serviceId) return;
        try {
            setLoading(true);
            const data = await fetchServiceNfcTags(serviceId, authToken);
            setTags(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.message || 'No se pudieron cargar los tags');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTags();
    }, [authToken, serviceId]);

    const handleReadTag = async () => {
        if (!nfcSupported) {
            toast.error('NFC no disponible en este dispositivo');
            return;
        }
        try {
            setSaving(true);
            const reader = new NDEFReader();
            const controller = new AbortController();
            await reader.scan({ signal: controller.signal });
            reader.onreading = (event) => {
                controller.abort();
                const uid = event.serialNumber || '';
                let text = '';
                for (const record of event.message.records) {
                    if (record.recordType === 'text') {
                        text = decodeTextRecord(record);
                        break;
                    }
                }
                setTagUid(uid);
                if (text) {
                    setTagName(text);
                }
                setLastRead(new Date().toLocaleTimeString());
                toast.success('Tag leido');
            };
            reader.onreadingerror = () => {
                toast.error('No se pudo leer el tag');
            };
        } catch (error) {
            toast.error('No se pudo iniciar la lectura NFC');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveTag = async () => {
        if (!tagUid || !tagName.trim()) {
            toast.error('Debes leer un tag y asignar un nombre');
            return;
        }
        try {
            setSaving(true);
            await createServiceNfcTag(
                serviceId,
                { tagUid, tagName: tagName.trim() },
                authToken
            );
            toast.success('Tag asociado');
            setTagUid('');
            setTagName('');
            setLastRead('');
            await loadTags();
        } catch (error) {
            toast.error(error.message || 'No se pudo asociar el tag');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTag = async (id) => {
        try {
            await deleteServiceNfcTag(serviceId, id, authToken);
            setTags((prev) => prev.filter((tag) => tag.id !== id));
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el tag');
        }
    };

    if (!user || !authToken) return null;

    return (
        <div className='nfc-tags'>
            <div className='nfc-tags-header'>
                <div>
                    <h3>Tags NFC</h3>
                    <p>Asocia tags NFC a este servicio.</p>
                </div>
                {!nfcSupported && (
                    <span className='nfc-tags-warning'>
                        NFC no disponible
                    </span>
                )}
            </div>

            <div className='nfc-tags-form'>
                <div className='nfc-tags-field'>
                    <label>Nombre del tag</label>
                    <input
                        type='text'
                        value={tagName}
                        onChange={(event) => setTagName(event.target.value)}
                        placeholder='Ej. Entrada principal'
                    />
                </div>
                <div className='nfc-tags-field'>
                    <label>UID del tag</label>
                    <input
                        type='text'
                        value={tagUid}
                        readOnly
                        placeholder='Leer tag NFC'
                    />
                </div>
                <div className='nfc-tags-actions'>
                    <button
                        type='button'
                        className='nfc-tags-btn'
                        onClick={handleReadTag}
                        disabled={saving || !nfcSupported}
                    >
                        Leer tag
                    </button>
                    <button
                        type='button'
                        className='nfc-tags-btn'
                        onClick={handleSaveTag}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
                {lastRead && (
                    <p className='nfc-tags-read'>
                        Ultima lectura: {lastRead}
                    </p>
                )}
            </div>

            <div className='nfc-tags-list'>
                {loading ? (
                    <p>Cargando tags...</p>
                ) : tags.length ? (
                    tags.map((tag) => (
                        <div key={tag.id} className='nfc-tags-item'>
                            <div>
                                <strong>{tag.tagName}</strong>
                                <span>{tag.tagUid}</span>
                            </div>
                            <button
                                type='button'
                                className='nfc-tags-btn nfc-tags-btn--ghost'
                                onClick={() => handleDeleteTag(tag.id)}
                            >
                                Eliminar
                            </button>
                        </div>
                    ))
                ) : (
                    <p>No hay tags asignados.</p>
                )}
            </div>
        </div>
    );
};

export default NfcTagsManager;
