const { VITE_API_URL } = import.meta.env;

const handleResponse = async (res) => {
    const body = await res.json();
    if (body.status === 'error') {
        throw new Error(body.message);
    }
    return body.data ?? body;
};

export const fetchServiceNfcTags = async (serviceId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/nfc-tags`, {
        headers: { Authorization: authToken },
    });
    return handleResponse(res);
};

export const createServiceNfcTag = async (
    serviceId,
    payload,
    authToken
) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/nfc-tags`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteServiceNfcTag = async (
    serviceId,
    tagId,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/nfc-tags/${tagId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return handleResponse(res);
};

export const createServiceNfcLog = async (
    serviceId,
    payload,
    authToken
) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/nfc-logs`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};
