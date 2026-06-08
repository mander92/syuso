import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import { fetchAllUsersServices } from '../../services/userService.js';
import {
    addGeneralChatMembers,
    createGeneralChat,
    deleteGeneralChat,
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

const chatTypeLabels = {
    standard: 'Grupales internos',
    announcement: 'Comunicados',
    direct: 'Individuales',
};

const getChatDisplayName = (chat) => {
    if (chat?.type !== 'direct') return chat?.name || 'Chat';
    return chat.directOtherName || chat.directOtherEmail || chat.name || 'Chat individual';
};

const GeneralChatDashboard = ({ focusChatId = '' }) => {
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
    const [chatTypeTab, setChatTypeTab] = useState('standard');
    const [loading, setLoading] = useState(false);

    const [userOptions, setUserOptions] = useState([]);
    const [newChatName, setNewChatName] = useState('');
    const [newChatType, setNewChatType] = useState('standard');
    const [newChatMembers, setNewChatMembers] = useState([]);
    const [directUserId, setDirectUserId] = useState('');
    const [directSearch, setDirectSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [memberRole, setMemberRole] = useState('');
    const [memberDelegation, setMemberDelegation] = useState('');

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
            const query = 'active=1';
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

    useEffect(() => {
        if (!focusChatId || !chats.length) return;

        const focusedChat = chats.find((chat) => chat.id === focusChatId);
        if (!focusedChat) return;

        setChatTypeTab(focusedChat.type || 'standard');
        setOpenChats((prev) => ({
            ...prev,
            [focusChatId]: true,
        }));
    }, [focusChatId, chats]);

    const chatTypeUnreadCounts = useMemo(() => {
        return chats.reduce(
            (acc, chat) => {
                const type = chat.type || 'standard';
                acc[type] = (acc[type] || 0) + (unreadByGeneral?.[chat.id] || 0);
                return acc;
            },
            { standard: 0, announcement: 0, direct: 0 }
        );
    }, [chats, unreadByGeneral]);

    const normalizedChats = useMemo(() => {
        const query = normalizeText(searchText);
        return chats
            .filter((chat) => (chat.type || 'standard') === chatTypeTab)
            .filter((chat) =>
                query
                    ? normalizeText(getChatDisplayName(chat)).includes(query)
                    : true
            );
    }, [chats, searchText, chatTypeTab]);

    const filteredMemberOptions = useMemo(() => {
        const query = normalizeText(memberSearch);
        return userOptions.filter((option) => {
            if (memberRole && option.role !== memberRole) return false;
            if (memberDelegation && option.city !== memberDelegation)
                return false;
            if (!query) return true;
            const name = normalizeText(
                `${option.firstName || ''} ${option.lastName || ''}`
            );
            return (
                name.includes(query) ||
                normalizeText(option.email || '').includes(query)
            );
        });
    }, [memberSearch, memberRole, memberDelegation, userOptions]);

    const delegationOptions = useMemo(() => {
        return [...new Set(userOptions.map((option) => option.city).filter(Boolean))]
            .sort();
    }, [userOptions]);

    const directUserOptions = useMemo(() => {
        const query = normalizeText(directSearch);
        return userOptions
            .filter((option) => option.id !== user?.id)
            .filter((option) =>
                ['employee', 'admin', 'sudo'].includes(option.role)
            )
            .filter((option) => {
                if (!query) return true;
                return normalizeText(
                    `${option.firstName || ''} ${option.lastName || ''} ${
                        option.email || ''
                    } ${option.city || ''}`
                ).includes(query);
            })
            .slice(0, 30);
    }, [directSearch, userOptions, user?.id]);

    const toggleMemberSelection = (memberId) => {
        setNewChatMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleSelectAllMembers = () => {
        const nextIds = filteredMemberOptions.map((option) => option.id);
        setNewChatMembers(nextIds);
    };

    const toggleChat = (chatId) => {
        setOpenChats((prev) => ({
            ...prev,
            [chatId]: !prev[chatId],
        }));
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
        if (newChatType === 'direct') {
            if (!directUserId) {
                toast.error('Selecciona un usuario');
                return;
            }
            const selectedUser = userOptions.find(
                (option) => option.id === directUserId
            );
            const userName =
                `${selectedUser?.firstName || ''} ${
                    selectedUser?.lastName || ''
                }`.trim() ||
                selectedUser?.email ||
                'Usuario';

            try {
                setCreating(true);
                const chat = await createGeneralChat(
                    authToken,
                    userName,
                    'direct',
                    [directUserId]
                );
                setDirectUserId('');
                setDirectSearch('');
                setChatTypeTab('direct');
                await loadChats();
                if (chat?.id) {
                    setOpenChats((prev) => ({ ...prev, [chat.id]: true }));
                }
                toast.success('Chat individual listo');
            } catch (error) {
                toast.error(error.message || 'No se pudo crear el chat');
            } finally {
                setCreating(false);
            }
            return;
        }

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
            setMemberDelegation('');
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

    const handleDeleteChat = async (chatId) => {
        if (!window.confirm('¿Eliminar este chat?')) return;
        try {
            await deleteGeneralChat(authToken, chatId);
            setChats((prev) => {
                const nextChats = prev.filter(
                    (chat) => chat.id !== chatId
                );
                syncGeneralChats(nextChats);
                return nextChats;
            });
            setOpenChats((prev) => {
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
            setMembersByChat((prev) => {
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
            setMembersVisible((prev) => {
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
            resetGeneralUnread(chatId);
            toast.success('Chat eliminado');
        } catch (error) {
            toast.error(error.message || 'No se pudo eliminar el chat');
        }
    };

    return (
        <section className='general-chat-dashboard'>
            <div className='general-chat-dashboard-header'>
                <div>
                    <h1>Chats internos</h1>
                    <p>Comparte comunicados o conversa con equipos internos.</p>
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

            <div className='general-chat-type-tabs'>
                {['standard', 'announcement', 'direct'].map((type) => (
                    <button
                        key={type}
                        type='button'
                        className={
                            'general-chat-type-tab' +
                            (chatTypeTab === type
                                ? ' general-chat-type-tab--active'
                                : '')
                        }
                        onClick={() => setChatTypeTab(type)}
                    >
                        {chatTypeLabels[type]}
                        {chatTypeUnreadCounts[type] > 0 ? (
                            <span className='general-chat-type-badge'>
                                {chatTypeUnreadCounts[type]}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>

            {isAdminLike && (
                <form
                    className='general-chat-create'
                    onSubmit={handleCreateChat}
                >
                    {newChatType !== 'direct' ? (
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
                    ) : null}
                    <div className='general-chat-create-field'>
                        <label htmlFor='general-chat-type'>Tipo</label>
                        <select
                            id='general-chat-type'
                            value={newChatType}
                            onChange={(event) =>
                                setNewChatType(event.target.value)
                            }
                        >
                            <option value='standard'>Grupal interno</option>
                            <option value='announcement'>Comunicado</option>
                            <option value='direct'>Individual</option>
                        </select>
                    </div>
                    {newChatType === 'direct' ? (
                        <div className='general-chat-create-field general-chat-create-field--wide'>
                            <label htmlFor='general-chat-direct-search'>
                                Usuario
                            </label>
                            <input
                                id='general-chat-direct-search'
                                type='text'
                                value={directSearch}
                                onChange={(event) =>
                                    setDirectSearch(event.target.value)
                                }
                                placeholder='Buscar empleado, admin o sudo...'
                            />
                            <div className='general-chat-direct-list'>
                                {directUserOptions.map((employee) => (
                                    <button
                                        key={employee.id}
                                        type='button'
                                        className={
                                            'general-chat-direct-item' +
                                            (directUserId === employee.id
                                                ? ' general-chat-direct-item--active'
                                                : '')
                                        }
                                        onClick={() =>
                                            setDirectUserId(employee.id)
                                        }
                                    >
                                        <strong>
                                            {employee.firstName || ''}{' '}
                                            {employee.lastName || ''}
                                        </strong>
                                        <span>
                                            {employee.city || 'Sin delegacion'} ·{' '}
                                            {employee.email}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
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
                    )}
                    <button type='submit' disabled={creating}>
                        {creating
                            ? 'Creando...'
                            : newChatType === 'direct'
                              ? 'Abrir chat individual'
                              : 'Crear chat'}
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
                                value={memberDelegation}
                                onChange={(event) =>
                                    setMemberDelegation(event.target.value)
                                }
                            >
                                <option value=''>Todas las delegaciones</option>
                                {delegationOptions.map((delegation) => (
                                    <option
                                        key={delegation}
                                        value={delegation}
                                    >
                                        {delegation}
                                    </option>
                                ))}
                            </select>
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
                        <div className='general-chat-modal-toolbar'>
                            <button
                                type='button'
                                onClick={handleSelectAllMembers}
                            >
                                Seleccionar todos
                            </button>
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
                                    <h3>{getChatDisplayName(chat)}</h3>
                                    <p>
                                        {chatTypeLabels[chat.type] || 'Grupales'}
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
                                    {isAdminLike && (
                                        <button
                                            type='button'
                                            className='general-chat-dashboard-danger'
                                            onClick={() =>
                                                handleDeleteChat(chat.id)
                                            }
                                        >
                                            Eliminar chat
                                        </button>
                                    )}
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
                                    chatName={getChatDisplayName(chat)}
                                    chatType={chat.type}
                                    compact
                                    manageRoom={false}
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
