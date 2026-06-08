import { useEffect, useMemo, useState } from 'react';

import { useChatNotifications } from '../../context/ChatNotificationsContext.jsx';
import ServiceChatDashboard from '../serviceChat/ServiceChatDashboard.jsx';
import GeneralChatDashboard from '../generalChat/GeneralChatDashboard.jsx';
import './ChatHub.css';

const ChatHub = ({ focusGeneralChatId = '' }) => {
    const { unreadByService, unreadByGeneral } = useChatNotifications();
    const [activeTab, setActiveTab] = useState('services');

    useEffect(() => {
        if (focusGeneralChatId) {
            setActiveTab('general');
        }
    }, [focusGeneralChatId]);

    const serviceUnreadTotal = useMemo(
        () =>
            Object.values(unreadByService || {}).reduce(
                (sum, value) => sum + (value || 0),
                0
            ),
        [unreadByService]
    );

    const generalUnreadTotal = useMemo(
        () =>
            Object.values(unreadByGeneral || {}).reduce(
                (sum, value) => sum + (value || 0),
                0
            ),
        [unreadByGeneral]
    );

    return (
        <section className='chat-hub'>
            <div className='chat-hub-tabs'>
                <button
                    type='button'
                    className={
                        'chat-hub-tab' +
                        (activeTab === 'services'
                            ? ' chat-hub-tab--active'
                            : '')
                    }
                    onClick={() => setActiveTab('services')}
                >
                    Grupales de servicio
                    {serviceUnreadTotal > 0 ? (
                        <span className='chat-hub-badge'>
                            {serviceUnreadTotal}
                        </span>
                    ) : null}
                </button>
                <button
                    type='button'
                    className={
                        'chat-hub-tab' +
                        (activeTab === 'general'
                            ? ' chat-hub-tab--active'
                            : '')
                    }
                    onClick={() => setActiveTab('general')}
                >
                    Internos
                    {generalUnreadTotal > 0 ? (
                        <span className='chat-hub-badge'>
                            {generalUnreadTotal}
                        </span>
                    ) : null}
                </button>
            </div>

            <div className='chat-hub-content'>
                {activeTab === 'services' ? (
                    <ServiceChatDashboard />
                ) : (
                    <GeneralChatDashboard focusChatId={focusGeneralChatId} />
                )}
            </div>
        </section>
    );
};

export default ChatHub;
