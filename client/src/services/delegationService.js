const { VITE_API_URL } = import.meta.env;

export const fetchDelegations = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/delegations`, {
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

export const createDelegation = async (authToken, name) => {
    const res = await fetch(`${VITE_API_URL}/delegations`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const updateDelegation = async (authToken, delegationId, name) => {
    const res = await fetch(
        `${VITE_API_URL}/delegations/${delegationId}`,
        {
            method: 'PUT',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const deleteDelegation = async (authToken, delegationId) => {
    const res = await fetch(
        `${VITE_API_URL}/delegations/${delegationId}`,
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

    return body;
};

export const fetchUserDelegations = async (authToken, userId) => {
    const res = await fetch(`${VITE_API_URL}/users/${userId}/delegations`, {
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
