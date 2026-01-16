import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchServiceChatMessages,
    fetchServiceChatMembers,
    uploadServiceChatImage,
} from '../../services/serviceChatService.js';
import { getChatSocket } from '../../services/chatSocket.js';
import './ServiceChat.css';

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
};

const ServiceChat = ({ serviceId, title, compact = false }) => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [chatPaused, setChatPaused] = useState(false);
    const [members, setMembers] = useState([]);
    const [membersVisible, setMembersVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [mentionInfo, setMentionInfo] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const listRef = useRef(null);
    const inputRef = useRef(null);

    const socket = useMemo(
        () => getChatSocket(authToken),
        [authToken]
    );
    const isAdminUser =
        user?.role === 'admin' || user?.role === 'sudo';
    const canReply = user?.role && user.role !== 'client';

    useEffect(() => {
        const loadMessages = async () => {
            if (!authToken || !serviceId) return;

            try {
                setLoading(true);
                const data = await fetchServiceChatMessages(
                    serviceId,
                    authToken
                );
                setMessages(data.messages || []);
                setChatPaused(Boolean(data.chatPaused));
            } catch (error) {
                toast.error(
                    error.message || 'No se pudo cargar el chat'
                );
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [authToken, serviceId]);

    const loadMembers = async () => {
        if (!authToken || !serviceId) return;
        try {
            const data = await fetchServiceChatMembers(
                serviceId,
                authToken
            );
            setMembers(data);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los miembros'
            );
        }
    };

    useEffect(() => {
        loadMembers();
    }, [authToken, serviceId]);

    useEffect(() => {
        if (!membersVisible) return;
        loadMembers();
    }, [membersVisible]);

    useEffect(() => {
        if (!socket || !serviceId) return;

        const handleConnect = () => setConnected(true);
        const handleDisconnect = () => setConnected(false);
        const handleMessage = (newMessage) => {
            if (newMessage?.serviceId !== serviceId) return;
            setMessages((prev) => [...prev, newMessage]);
        };
        const handlePause = (payload) => {
            if (payload?.serviceId !== serviceId) return;
            setChatPaused(Boolean(payload.paused));
        };
        const handleClear = (payload) => {
            if (payload?.serviceId !== serviceId) return;
            setMessages([]);
        };
        const handleDelete = (payload) => {
            if (payload?.serviceId !== serviceId) return;
            if (!payload.messageId) return;
            setMessages((prev) =>
                prev.filter((item) => item.id !== payload.messageId)
            );
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('chat:message', handleMessage);
        socket.on('chat:pause', handlePause);
        socket.on('chat:clear', handleClear);
        socket.on('chat:delete', handleDelete);

        socket.emit('chat:join', { serviceId }, (response) => {
            if (response?.ok === false) {
                toast.error(response.message || 'No se pudo unir al chat');
            }
        });

        return () => {
            socket.emit('chat:leave', { serviceId });
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('chat:message', handleMessage);
            socket.off('chat:pause', handlePause);
            socket.off('chat:clear', handleClear);
            socket.off('chat:delete', handleDelete);
        };
    }, [socket, serviceId]);

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

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    const getMentionInfo = (value, caret) => {
        if (caret == null) return null;
        const uptoCaret = value.slice(0, caret);
        const atIndex = uptoCaret.lastIndexOf('@');
        if (atIndex === -1) return null;
        if (atIndex > 0 && !/\s/.test(uptoCaret[atIndex - 1])) return null;
        const query = uptoCaret.slice(atIndex + 1);
        if (query.includes(' ')) return null;
        return { query, start: atIndex, end: caret };
    };

    const handleMessageChange = (event) => {
        const value = event.target.value;
        setMessageText(value);

        const caret = event.target.selectionStart;
        const info = getMentionInfo(value, caret);
        setMentionInfo(info);
    };

    const handleSelectMention = (member) => {
        if (!mentionInfo) return;
        const name = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        if (!name) return;
        const before = messageText.slice(0, mentionInfo.start);
        const after = messageText.slice(mentionInfo.end);
        const nextValue = `${before}@${name} ${after}`;
        setMessageText(nextValue);
        setMentionInfo(null);

        requestAnimationFrame(() => {
            if (!inputRef.current) return;
            const caretPos = (before + `@${name} `).length;
            inputRef.current.focus();
            inputRef.current.setSelectionRange(caretPos, caretPos);
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!messageText.trim() && !selectedImage) return;
        if (!socket) {
            toast.error('Chat no disponible');
            return;
        }
        if (chatPaused) {
            toast.error('El chat esta en pausa');
            return;
        }

        let imagePath = null;

        if (selectedImage) {
            try {
                const data = await uploadServiceChatImage(
                    serviceId,
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
            'chat:message',
            {
                serviceId,
                message: messageText.trim(),
                imagePath,
                replyToMessageId: replyTo?.id || null,
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
        setReplyTo(null);
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

    const handleTogglePause = () => {
        if (!socket) return;
        socket.emit(
            'chat:pause',
            { serviceId, paused: !chatPaused },
            (response) => {
                if (response?.ok === false) {
                    toast.error(
                        response.message || 'No se pudo pausar el chat'
                    );
                    return;
                }
                setChatPaused(Boolean(response?.paused));
            }
        );
    };

    const handleClearChat = () => {
        if (!socket) return;
        const shouldClear = window.confirm(
            'Este chat se eliminara por completo. ¿Continuar?'
        );
        if (!shouldClear) return;
        socket.emit('chat:clear', { serviceId }, (response) => {
            if (response?.ok === false) {
                toast.error(
                    response.message || 'No se pudo eliminar el chat'
                );
                return;
            }
            setMessages([]);
            setReplyTo(null);
            toast.success('Chat eliminado');
        });
    };

    const handleDeleteMessage = (messageId) => {
        if (!socket) return;
        const shouldDelete = window.confirm(
            '¿Eliminar este mensaje del chat?'
        );
        if (!shouldDelete) return;
        socket.emit(
            'chat:delete',
            { serviceId, messageId },
            (response) => {
                if (response?.ok === false) {
                    toast.error(
                        response.message || 'No se pudo eliminar el mensaje'
                    );
                    return;
                }
                setMessages((prev) =>
                    prev.filter((item) => item.id !== messageId)
                );
            }
        );
    };

    const handleReply = (message) => {
        if (!message) return;
        setReplyTo({
            id: message.id,
            firstName: message.firstName,
            lastName: message.lastName,
            message: message.message,
        });
        inputRef.current?.focus();
    };

    const handleCancelReply = () => {
        setReplyTo(null);
    };

    const mentionCandidates = useMemo(() => {
        if (!mentionInfo) return [];
        const query = normalizeText(mentionInfo.query);
        return members.filter((member) => {
            const name = normalizeText(
                `${member.firstName || ''} ${member.lastName || ''}`
            );
            return name.includes(query);
        });
    }, [mentionInfo, members]);

    const renderMessageText = (text) => {
        const parts = String(text || '').split(/(@[^\s]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span key={`${part}-${index}`} className='service-chat-mention'>
                        {part}
                    </span>
                );
            }
            return <span key={`${part}-${index}`}>{part}</span>;
        });
    };

    return (
        <section className={`service-chat ${compact ? 'service-chat--compact' : ''}`}>
            <header className='service-chat-header'>
                <div>
                    <h3>{title || 'Chat del servicio'}</h3>
                    <p>
                        {connected ? 'Conectado' : 'Desconectado'}
                        {chatPaused ? ' · Chat en pausa' : ''}
                    </p>
                </div>
                <div className='service-chat-header-actions'>
                    {isAdminUser && (
                        <>
                            <button
                                type='button'
                                className='service-chat-members-btn'
                                onClick={handleTogglePause}
                            >
                                {chatPaused ? 'Reactivar chat' : 'Pausar chat'}
                            </button>
                            <button
                                type='button'
                                className='service-chat-members-btn service-chat-danger'
                                onClick={handleClearChat}
                            >
                                Eliminar chat
                            </button>
                        </>
                    )}
                    <button
                        type='button'
                        className='service-chat-members-btn'
                        onClick={() => setMembersVisible((prev) => !prev)}
                    >
                        {membersVisible ? 'Ocultar miembros' : 'Ver miembros'}
                    </button>
                </div>
            </header>

            {membersVisible && (
                <div className='service-chat-members'>
                    {members.length ? (
                        members.map((member) => (
                            <span
                                key={member.id}
                                className='service-chat-member'
                            >
                                {member.firstName || ''} {member.lastName || ''}{' '}
                                <strong>{member.role}</strong>
                            </span>
                        ))
                    ) : (
                        <span className='service-chat-empty'>
                            Sin miembros disponibles.
                        </span>
                    )}
                </div>
            )}

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
                                {item.replyToMessageId && (
                                    <div className='service-chat-reply'>
                                        <span>
                                            Responde a{' '}
                                            {`${item.replyToFirstName || ''} ${item.replyToLastName || ''}`.trim() ||
                                                'mensaje'}
                                        </span>
                                        <p>
                                            {item.replyToMessage ||
                                                'Mensaje eliminado'}
                                        </p>
                                    </div>
                                )}
                                {item.message ? (
                                    <p>{renderMessageText(item.message)}</p>
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
                                {canReply && (
                                    <div className='service-chat-actions'>
                                        <button
                                            type='button'
                                            onClick={() => handleReply(item)}
                                        >
                                            Responder
                                        </button>
                                        {isAdminUser && (
                                            <button
                                                type='button'
                                                className='service-chat-action-delete'
                                                onClick={() =>
                                                    handleDeleteMessage(item.id)
                                                }
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                )}
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
                {replyTo && (
                    <div className='service-chat-reply-banner'>
                        <span>
                            Respondiendo a{' '}
                            {`${replyTo.firstName || ''} ${replyTo.lastName || ''}`.trim() ||
                                'mensaje'}
                        </span>
                        <button
                            type='button'
                            onClick={handleCancelReply}
                        >
                            Cancelar
                        </button>
                    </div>
                )}
                <div className='service-chat-input-wrap'>
                    <input
                        ref={inputRef}
                        type='text'
                        placeholder='Escribe un mensaje...'
                        value={messageText}
                        onChange={handleMessageChange}
                        disabled={chatPaused}
                    />
                    {mentionInfo && mentionCandidates.length > 0 && (
                        <div className='service-chat-mentions'>
                            {mentionCandidates.map((member) => (
                                <button
                                    type='button'
                                    key={member.id}
                                    className='service-chat-mention-item'
                                    onClick={() =>
                                        handleSelectMention(member)
                                    }
                                >
                                    {member.firstName || ''}{' '}
                                    {member.lastName || ''}{' '}
                                    <span>{member.role}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <label className='service-chat-attach'>
                    Adjuntar
                    <input
                        type='file'
                        accept='image/*'
                        onChange={handleImageChange}
                        disabled={chatPaused}
                    />
                </label>
                <button type='submit' disabled={chatPaused}>
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

export default ServiceChat;
