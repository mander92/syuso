const { VITE_API_URL } = import.meta.env;

const handleResponse = async (res) => {
    const body = await res.json();
    if (body.status === 'error') {
        throw new Error(body.message || 'No se pudo completar la operación');
    }
    return body.data ?? body;
};

export const fetchMyShiftSwapRequests = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/shift-swaps/mine`, {
        headers: { Authorization: authToken },
    });
    return handleResponse(res);
};

export const fetchAdminShiftSwapRequests = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/shift-swaps/admin`, {
        headers: { Authorization: authToken },
    });
    return handleResponse(res);
};

export const createShiftSwapRequest = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/shift-swaps`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const approveShiftSwapRequest = async (authToken, requestId) => {
    const res = await fetch(
        `${VITE_API_URL}/shift-swaps/${requestId}/approve`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
            },
        }
    );
    return handleResponse(res);
};

export const confirmShiftSwapRequest = async (authToken, requestId) => {
    const res = await fetch(
        `${VITE_API_URL}/shift-swaps/${requestId}/confirm`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
            },
        }
    );
    return handleResponse(res);
};

export const rejectCounterpartShiftSwapRequest = async (
    authToken,
    requestId,
    reason = ''
) => {
    const res = await fetch(
        `${VITE_API_URL}/shift-swaps/${requestId}/counterpart-reject`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
        }
    );
    return handleResponse(res);
};

export const rejectShiftSwapRequest = async (
    authToken,
    requestId,
    reason = ''
) => {
    const res = await fetch(
        `${VITE_API_URL}/shift-swaps/${requestId}/reject`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
        }
    );
    return handleResponse(res);
};
