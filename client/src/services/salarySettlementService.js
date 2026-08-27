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

const buildQuery = (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    return params.toString();
};

export const fetchSalarySettlements = async (authToken, filters = {}) => {
    const query = buildQuery(filters);
    const res = await fetch(
        `${VITE_API_URL}/salary-settlements${query ? `?${query}` : ''}`,
        {
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const saveSalaryRate = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/salary-settlements/rates`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return assertOk(await readJsonBody(res));
};

export const createSalaryAdjustment = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/salary-settlements/adjustments`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return assertOk(await readJsonBody(res));
};

export const saveSalaryAbsencePayment = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/salary-settlements/absence-payments`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return assertOk(await readJsonBody(res));
};

export const deleteSalaryAdjustment = async (authToken, adjustmentId) => {
    const res = await fetch(
        `${VITE_API_URL}/salary-settlements/adjustments/${adjustmentId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};
