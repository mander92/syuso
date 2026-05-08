const { VITE_API_URL } = import.meta.env;

const handleResponse = async (res) => {
    const body = await res.json();
    if (body.status === 'error') {
        throw new Error(body.message || 'No se pudo completar la operacion');
    }
    return body.data ?? body;
};

export const fetchMyEmployeeRequests = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/employee-requests/mine`, {
        headers: { Authorization: authToken },
    });
    return handleResponse(res);
};

export const fetchAdminEmployeeRequests = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/employee-requests/admin`, {
        headers: { Authorization: authToken },
    });
    return handleResponse(res);
};

export const createEmployeeRequest = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/employee-requests`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const approveEmployeeRequest = async (
    authToken,
    requestId,
    decisionNotes = ''
) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-requests/${requestId}/approve`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ decisionNotes }),
        }
    );
    return handleResponse(res);
};

export const rejectEmployeeRequest = async (
    authToken,
    requestId,
    decisionNotes = ''
) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-requests/${requestId}/reject`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ decisionNotes }),
        }
    );
    return handleResponse(res);
};
