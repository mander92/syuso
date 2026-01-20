import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    addGeneralChatMembers,
    createGeneralChat,
    fetchGeneralChatMembers,
    fetchGeneralChats,
    removeGeneralChatMember,
} from '../../services/generalChatService.js';
import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import GeneralChat from './GeneralChat.jsx';
import './GeneralChatDashboard.css';

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const GeneralChatDashboard = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const { unreadByGeneral, resetGeneralUnread, syncGeneralChats } =
        useChatNotifications();
    const [chats, setChats] = useState([]);
    const [openChats, setOpenChats] = useState({});
    const [membersByChat, setMembersByChat] = useState({});
    const [membersVisible, setMembersVisible] = useState({});
    const [addSelections, setAddSelections] = useState({});
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);

    const [userOptions, setUserOptions] = useState([]);
    const [newChatName, setNewChatName] = useState('');
    const [newChatType, setNewChatType] = useState('standard');
    const [newChatMembers, setNewChatMembers] = useState([]);
    const [creating, setCreating] = useState(false);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [memberRole, setMemberRole] = useState('');

    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';

    const loadChats = async () => {
        if (!authToken || !user) return;
        try {
            setLoading(true);
            const data = await fetchGeneralChats(authToken);
            const nextChats = Array.isArray(data) ? data : [];
            setChats(nextChats);
            syncGeneralChats(nextChats);
        } catch (error) {
            setChats([]);
            syncGeneralChats([]);
            toast.error(
                error.message || 'No se pudieron cargar los chats'
            );
        } finally {
            setLoading(false);
        }
    };

    const loadMembers = async (chatId) => {
        if (!authToken || !chatId) return;
        try {
            const data = await fetchGeneralChatMembers(chatId, authToken);
            setMembersByChat((prev) => ({
                ...prev,
                [chatId]: Array.isArray(data) ? data : [],
            }));
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los miembros'
            );
        }
    };

    const loadUsers = async () => {
        if (!authToken || !user || !isAdminLike) return;
        try {
            const query =
                user.role === 'admin'
                    ? 'role=employee&active=1'
                    : 'active=1';
            const data = await fetchAllUsersServices(query, authToken);
            setUserOptions(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(
                error.message || 'No se pudieron cargar los usuarios'
            );
        }
    };

    useEffect(() => {
        loadChats();
    }, [authToken, user]);

    useEffect(() => {
        loadUsers();
    }, [authToken, user]);

    const normalizedChats = useMemo(() => {
        const query = normalizeText(searchText);
        return chats.filter((chat) =>
            query ? normalizeText(chat.name).includes(query) : true
        );
    }, [chats, searchText]);

    const filteredMemberOptions = useMemo(() => {
        const query = normalizeText(memberSearch);
        return userOptions.filter((option) => {
            if (memberRole && option.role !== memberRole) return false;
            if (!query) return true;
            const name = normalizeText(
                `${option.firstName || ''} ${option.lastName || ''}`
            );
            return (
                name.includes(query) ||
                normalizeText(option.email || '').includes(query)
            );
        });
    }, [memberSearch, memberRole, userOptions]);

    const toggleMemberSelection = (memberId) => {
        setNewChatMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    const toggleChat = (chatId) => {
        setOpenChats((prev) => ({
            ...prev,
            [chatId]: !prev[chatId],
        }));
        resetGeneralUnread(chatId);
    };

    const toggleMembers = (chatId) => {
        setMembersVisible((prev) => ({
            ...prev,
            [chatId]: !prev[chatId],
        }));
        if (!membersVisible[chatId]) {
            loadMembers(chatId);
        }
    };

    const handleCreateChat = async (event) => {
        event.preventDefault();
        if (!newChatName.trim()) {
            toast.error('Nombre requerido');
            return;
        }

        try {
            setCreating(true);
            await createGeneralChat(
                authToken,
                newChatName.trim(),
                newChatType,
                newChatMembers
            );
            setNewChatName('');
            setNewChatMembers([]);
            setMemberSearch('');
            setMemberRole('');
            setMemberModalOpen(false);
            await loadChats();
            toast.success('Chat creado');
        } catch (error) {
            toast.error(error.message || 'No se pudo crear el chat');
        } finally {
            setCreating(false);
        }
    };

    const handleAddMembers = async (chatId) => {
        const members = addSelections[chatId] || [];
        if (!members.length) {
            toast.error('Selecciona al menos un usuario');
            return;
        }

        try {
            await addGeneralChatMembers(authToken, chatId, members);
            setAddSelections((prev) => ({ ...prev, [chatId]: [] }));
            await loadMembers(chatId);
            toast.success('Miembros agregados');
        } catch (error) {
            toast.error(error.message || 'No se pudieron agregar');
        }
    };

    const handleRemoveMember = async (chatId, memberId) => {
        try {
            await removeGeneralChatMember(authToken, chatId, memberId);
            await loadMembers(chatId);
            toast.success('Miembro eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar');
        }
    };

    return (
        <section className='general-chat-dashboard'>
            <div className='general-chat-dashboard-header'>
                <div>
                    <h1>Chats generales</h1>
                    <p>Comparte anuncios o conversa con equipos internos.</p>
                </div>
                <div className='general-chat-dashboard-filter'>
                    <label htmlFor='general-chat-search'>
                        Buscar chat
                    </label>
                    <input
                        id='general-chat-search'
                        type='text'
                        placeholder='Escribe el nombre...'
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                    />
                </div>
            </div>

            {isAdminLike && (
                <form
                    className='general-chat-create'
                    onSubmit={handleCreateChat}
                >
                    <div className='general-chat-create-field'>
                        <label htmlFor='general-chat-name'>Nombre</label>
                        <input
                            id='general-chat-name'
                            type='text'
                            value={newChatName}
                            onChange={(event) =>
                                setNewChatName(event.target.value)
                            }
                            placeholder='Nombre del chat'
                        />
                    </div>
                    <div className='general-chat-create-field'>
                        <label htmlFor='general-chat-type'>Tipo</label>
                        <select
                            id='general-chat-type'
                            value={newChatType}
                            onChange={(event) =>
                                setNewChatType(event.target.value)
                            }
                        >
                            <option value='standard'>Chat normal</option>
                            <option value='announcement'>Anuncios</option>
                        </select>
                    </div>
                    <div className='general-chat-create-field'>
                        <label htmlFor='general-chat-members'>Miembros</label>
                        <div className='general-chat-member-picker'>
                            <button
                                type='button'
                                className='general-chat-member-btn'
                                onClick={() => setMemberModalOpen(true)}
                            >
                                {newChatMembers.length
                                    ? `${newChatMembers.length} seleccionados`
                                    : 'Seleccionar miembros'}
                            </button>
                            <span className='general-chat-member-hint'>
                                Solo empleados y admins segun permisos.
                            </span>
                        </div>
                    </div>
                    <button type='submit' disabled={creating}>
                        {creating ? 'Creando...' : 'Crear chat'}
                    </button>
                </form>
            )}

            {memberModalOpen && (
                <div className='general-chat-modal-overlay'>
                    <div className='general-chat-modal'>
                        <div className='general-chat-modal-header'>
                            <h3>Seleccionar miembros</h3>
                            <button
                                type='button'
                                onClick={() => setMemberModalOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className='general-chat-modal-filters'>
                            <input
                                type='text'
                                placeholder='Buscar por nombre o email'
                                value={memberSearch}
                                onChange={(event) =>
                                    setMemberSearch(event.target.value)
                                }
                            />
                            <select
                                value={memberRole}
                                onChange={(event) =>
                                    setMemberRole(event.target.value)
                                }
                            >
                                <option value=''>Todos los roles</option>
                                <option value='employee'>Empleado</option>
                                <option value='admin'>Admin</option>
                                <option value='sudo'>Sudo</option>
                            </select>
                        </div>
                        <div className='general-chat-modal-list'>
                            {filteredMemberOptions.length ? (
                                filteredMemberOptions.map((option) => (
                                    <label
                                        key={option.id}
                                        className='general-chat-modal-item'
                                    >
                                        <input
                                            type='checkbox'
                                            checked={newChatMembers.includes(
                                                option.id
                                            )}
                                            onChange={() =>
                                                toggleMemberSelection(option.id)
                                            }
                                        />
                                        <span>
                                            {option.firstName || ''}{' '}
                                            {option.lastName || ''} (
                                            {option.role})
                                        </span>
                                    </label>
                                ))
                            ) : (
                                <p className='general-chat-modal-empty'>
                                    No hay usuarios con ese filtro.
                                </p>
                            )}
                        </div>
                        <div className='general-chat-modal-actions'>
                            <button
                                type='button'
                                className='general-chat-modal-clear'
                                onClick={() => setNewChatMembers([])}
                            >
                                Limpiar seleccion
                            </button>
                            <button
                                type='button'
                                className='general-chat-modal-apply'
                                onClick={() => setMemberModalOpen(false)}
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <p className='general-chat-dashboard-loading'>
                    Cargando chats...
                </p>
            ) : normalizedChats.length ? (
                <div className='general-chat-dashboard-list'>
                    {normalizedChats.map((chat) => (
                        <div
                            key={chat.id}
                            className='general-chat-dashboard-card'
                        >
                            <div className='general-chat-dashboard-card-row'>
                                <div>
                                    <h3>{chat.name}</h3>
                                    <p>
                                        {chat.type === 'announcement'
                                            ? 'Anuncios'
                                            : 'Chat normal'}
                                    </p>
                                </div>
                                <div className='general-chat-dashboard-actions'>
                                    <button
                                        type='button'
                                        className='general-chat-dashboard-btn'
                                        onClick={() => toggleChat(chat.id)}
                                    >
                                        {openChats[chat.id]
                                            ? 'Cerrar chat'
                                            : 'Abrir chat'}
                                        {unreadByGeneral?.[chat.id] ? (
                                            <span className='service-chat-badge'>
                                                {unreadByGeneral[chat.id]}
                                            </span>
                                        ) : null}
                                    </button>
                                    <button
                                        type='button'
                                        className='general-chat-dashboard-secondary'
                                        onClick={() => toggleMembers(chat.id)}
                                    >
                                        {membersVisible[chat.id]
                                            ? 'Ocultar miembros'
                                            : 'Ver miembros'}
                                    </button>
                                </div>
                            </div>

                            {membersVisible[chat.id] && (
                                <div className='general-chat-members'>
                                    {(membersByChat[chat.id] || []).length ? (
                                        <div className='general-chat-members-list'>
                                            {membersByChat[chat.id].map((member) => (
                                                <div
                                                    key={member.id}
                                                    className='general-chat-member'
                                                >
                                                    <span>
                                                        {member.firstName || ''}{' '}
                                                        {member.lastName || ''} ({member.role})
                                                    </span>
                                                    {isAdminLike && (
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                handleRemoveMember(
                                                                    chat.id,
                                                                    member.id
                                                                )
                                                            }
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className='general-chat-empty'>
                                            Sin miembros disponibles.
                                        </p>
                                    )}

                                    {isAdminLike && (
                                        <div className='general-chat-add'>
                                            <label>Agregar miembros</label>
                                            <select
                                                multiple
                                                value={addSelections[chat.id] || []}
                                                onChange={(event) =>
                                                    setAddSelections((prev) => ({
                                                        ...prev,
                                                        [chat.id]: Array.from(
                                                            event.target.selectedOptions,
                                                            (option) => option.value
                                                        ),
                                                    }))
                                                }
                                            >
                                                {userOptions.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.firstName || ''} {option.lastName || ''} ({option.role})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type='button'
                                                onClick={() => handleAddMembers(chat.id)}
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {openChats[chat.id] && (
                                <GeneralChat
                                    chatId={chat.id}
                                    chatName={chat.name}
                                    chatType={chat.type}
                                    compact
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className='general-chat-dashboard-empty'>
                    No hay chats generales disponibles.
                </p>
            )}
        </section>
    );
};

export default GeneralChatDashboard;
