import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchGeneralChatMessages,
    uploadGeneralChatImage,
} from '../../services/generalChatService.js';
import { getChatSocket } from '../../services/chatSocket.js';
import '../serviceChat/ServiceChat.css';

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
};

const GeneralChat = ({ chatId, chatName, chatType, compact = false, manageRoom = true }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const listRef = useRef(null);

    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );

    const isAdminUser = user?.role === 'admin' || user?.role === 'sudo';
    const canWrite = chatType !== 'announcement' || isAdminUser;

    useEffect(() => {
        const loadMessages = async () => {
            if (!authToken || !chatId) return;

            try {
                setLoading(true);
                const data = await fetchGeneralChatMessages(
                    chatId,
                    authToken
                );
                setMessages(data.messages || []);
            } catch (error) {
                toast.error(
                    error.message || 'No se pudo cargar el chat'
                );
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [authToken, chatId]);

    useEffect(() => {
        if (!socket || !chatId) return;

        setConnected(socket.connected);
        const joinRoom = () => {
            if (!manageRoom) return;
            socket.emit('generalChat:join', { chatId }, (response) => {
                if (response?.ok === false) {
                    toast.error(response.message || 'No se pudo unir al chat');
                }
            });
        };
        const handleConnect = () => {
            setConnected(true);
            joinRoom();
        };
        const handleDisconnect = () => setConnected(false);
        const handleMessage = (newMessage) => {
            if (!newMessage?.chatId) return;
            if (newMessage.chatId !== chatId) return;
            setMessages((prev) => [...prev, newMessage]);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('generalChat:message', handleMessage);

        joinRoom();

        return () => {
            if (manageRoom) {
                socket.emit('generalChat:leave', { chatId });
            }
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('generalChat:message', handleMessage);
        };
    }, [socket, chatId, manageRoom]);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!selectedImage) {
            setImagePreview('');
            return;
        }

        const preview = URL.createObjectURL(selectedImage);
        setImagePreview(preview);

        return () => URL.revokeObjectURL(preview);
    }, [selectedImage]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!messageText.trim() && !selectedImage) return;
        if (!socket) {
            toast.error('Chat no disponible');
            return;
        }
        if (!canWrite) {
            toast.error('Solo administradores pueden escribir');
            return;
        }

        let imagePath = null;

        if (selectedImage) {
            try {
                const data = await uploadGeneralChatImage(
                    chatId,
                    authToken,
                    selectedImage
                );
                imagePath = data?.imagePath || null;
            } catch (error) {
                toast.error(
                    error.message || 'No se pudo subir la imagen'
                );
                return;
            }
        }

        socket.emit(
            'generalChat:message',
            {
                chatId,
                message: messageText.trim(),
                imagePath,
            },
            (response) => {
                if (response?.ok === false) {
                    toast.error(
                        response.message || 'No se pudo enviar el mensaje'
                    );
                }
            }
        );

        setMessageText('');
        setSelectedImage(null);
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imagenes');
            return;
        }
        setSelectedImage(file);
        event.target.value = '';
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
    };

    return (
        <section className={`service-chat ${compact ? 'service-chat--compact' : ''}`}>
            <header className='service-chat-header'>
                <div>
                    <h3>{chatName || 'Chat general'}</h3>
                    <p>
                        {connected ? 'Conectado' : 'Desconectado'}
                        {chatType === 'announcement'
                            ? ' · Anuncios'
                            : ''}
                    </p>
                </div>
                {chatType === 'announcement' && !isAdminUser ? (
                    <div className='service-chat-header-actions'>
                        <span className='service-chat-members-btn'>
                            Solo administradores pueden escribir
                        </span>
                    </div>
                ) : null}
            </header>

            <div className='service-chat-body' ref={listRef}>
                {loading ? (
                    <p className='service-chat-loading'>Cargando mensajes...</p>
                ) : messages.length ? (
                    messages.map((item) => {
                        const isMine = item.userId === user?.id;
                        return (
                            <div
                                key={item.id}
                                className={
                                    'service-chat-message' +
                                    (isMine
                                        ? ' service-chat-message--mine'
                                        : '')
                                }
                            >
                                <div className='service-chat-meta'>
                                    <span>
                                        {isMine
                                            ? 'Yo'
                                            : `${item.firstName || ''} ${item.lastName || ''}`}
                                    </span>
                                    <span>{formatTime(item.createdAt)}</span>
                                </div>
                                {item.message ? (
                                    <p>{item.message}</p>
                                ) : null}
                                {item.imagePath ? (
                                    <div className='service-chat-image'>
                                        <a
                                            href={`${import.meta.env.VITE_API_URL}/uploads/${item.imagePath}`}
                                            target='_blank'
                                            rel='noreferrer'
                                        >
                                            <img
                                                src={`${import.meta.env.VITE_API_URL}/uploads/${item.imagePath}`}
                                                alt='Adjunto'
                                            />
                                        </a>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })
                ) : (
                    <p className='service-chat-empty'>
                        Todavia no hay mensajes.
                    </p>
                )}
            </div>

            <form className='service-chat-form' onSubmit={handleSubmit}>
                <div className='service-chat-input-wrap'>
                    <input
                        type='text'
                        placeholder='Escribe un mensaje...'
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        disabled={!canWrite}
                    />
                </div>
                <label className='service-chat-attach'>
                    Adjuntar
                    <input
                        type='file'
                        accept='image/*'
                        onChange={handleImageChange}
                        disabled={!canWrite}
                    />
                </label>
                <button type='submit' disabled={!canWrite}>
                    Enviar
                </button>
            </form>
            {selectedImage && (
                <div className='service-chat-preview'>
                    {imagePreview && (
                        <img src={imagePreview} alt='Vista previa' />
                    )}
                    <button
                        type='button'
                        className='service-chat-remove'
                        onClick={handleRemoveImage}
                    >
                        Quitar foto
                    </button>
                </div>
            )}
        </section>
    );
};

export default GeneralChat;
