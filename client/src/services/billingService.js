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

export const fetchBilling = async (authToken, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${VITE_API_URL}/billing${suffix}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const calculateBilling = async (authToken, payload) => {
    const params = new URLSearchParams(payload);
    const res = await fetch(`${VITE_API_URL}/billing/calculate?${params}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const requestInvoice = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/billing/request-invoice`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const body = await readJsonBody(res);
    if (body.status === 'error') throw new Error(body.message);
    return body;
};

export const ignorePendingBilling = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/billing/ignore-pending`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const body = await readJsonBody(res);
    if (body.status === 'error') throw new Error(body.message);
    return body;
};

export const generateBillingInvoice = async (authToken, billingRecordId, payload) => {
    const res = await fetch(
        `${VITE_API_URL}/billing/${billingRecordId}/generate-invoice`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );
    const body = await readJsonBody(res);
    if (body.status === 'error') throw new Error(body.message);
    return body;
};

export const sendInvoiceToClient = async ({
    authToken,
    billingRecordId,
    emails,
    ccEmails,
    message,
    invoiceFile,
}) => {
    const formData = new FormData();
    formData.append('emails', emails || '');
    formData.append('ccEmails', ccEmails || '');
    formData.append('message', message || '');
    if (invoiceFile) formData.append('invoiceFile', invoiceFile);

    const res = await fetch(
        `${VITE_API_URL}/billing/${billingRecordId}/send-invoice`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
            body: formData,
        }
    );
    const body = await readJsonBody(res);
    if (body.status === 'error') throw new Error(body.message);
    return body;
};

export const deleteBillingRecord = async (authToken, billingRecordId) => {
    const res = await fetch(`${VITE_API_URL}/billing/${billingRecordId}`, {
        method: 'DELETE',
        headers: { Authorization: authToken },
    });
    const body = await readJsonBody(res);
    if (body.status === 'error') throw new Error(body.message);
    return body;
};
