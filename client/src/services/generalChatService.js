const { VITE_API_URL } = import.meta.env;

export const fetchGeneralChats = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/general-chats`, {
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data || [];
};

export const fetchGeneralChatMessages = async (chatId, authToken) => {
    const res = await fetch(
        `${VITE_API_URL}/general-chats/${chatId}/messages`,
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

    return body.data || { messages: [] };
};

export const fetchGeneralChatMembers = async (chatId, authToken) => {
    const res = await fetch(
        `${VITE_API_URL}/general-chats/${chatId}/members`,
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

export const createGeneralChat = async (
    authToken,
    name,
    type,
    memberIds
) => {
    const res = await fetch(`${VITE_API_URL}/general-chats`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name,
            type,
            memberIds: Array.isArray(memberIds) ? memberIds : [],
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const addGeneralChatMembers = async (authToken, chatId, memberIds) => {
    const res = await fetch(
        `${VITE_API_URL}/general-chats/${chatId}/members`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                memberIds: Array.isArray(memberIds) ? memberIds : [],
            }),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data || [];
};

export const removeGeneralChatMember = async (
    authToken,
    chatId,
    memberId
) => {
    const res = await fetch(
        `${VITE_API_URL}/general-chats/${chatId}/members/${memberId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const uploadGeneralChatImage = async (chatId, authToken, file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(
        `${VITE_API_URL}/general-chats/${chatId}/image`,
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

export const fetchGeneralChatUnreadCounts = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/general-chats/unread`, {
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
