const { VITE_API_URL } = import.meta.env;

const readJsonBody = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            res.ok
                ? 'La respuesta del servidor no es JSON valido'
                : `Error del servidor (${res.status})`
        );
    }
};

const assertOk = (body) => {
    if (body.status === 'error') throw new Error(body.message);
    return body.data;
};

export const fetchMyAcknowledgements = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/acknowledgements`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchAcknowledgementsAudit = async (authToken, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${VITE_API_URL}/acknowledgements/audit${suffix}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const createAcknowledgement = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/acknowledgements`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return assertOk(await readJsonBody(res));
};

export const markAcknowledgementSeen = async (authToken, acknowledgementId) => {
    const res = await fetch(
        `${VITE_API_URL}/acknowledgements/${acknowledgementId}/seen`,
        {
            method: 'PUT',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const acceptAcknowledgement = async (authToken, acknowledgementId) => {
    const res = await fetch(
        `${VITE_API_URL}/acknowledgements/${acknowledgementId}/accept`,
        {
            method: 'PUT',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};
