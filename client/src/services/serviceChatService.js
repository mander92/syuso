const { VITE_API_URL } = import.meta.env;

export const fetchServiceChatMessages = async (serviceId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/chat`, {
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    const data = body.data || {};

    if (Array.isArray(data)) {
        return { messages: data, chatPaused: false };
    }

    return {
        messages: data.messages || [],
        chatPaused: Boolean(data.chatPaused),
    };
};

export const fetchServiceChatMembers = async (serviceId, authToken) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/chat/members`,
        {
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data || [];
};

export const uploadServiceChatImage = async (serviceId, authToken, file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/chat/image`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
            },
            body: formData,
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchServiceChatUnreadCounts = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/services/chat/unread`, {
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data || { counts: {}, total: 0 };
};
