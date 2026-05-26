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

export const fetchPayrolls = async (authToken, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${VITE_API_URL}/payrolls${suffix}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const importPayrolls = async ({
    authToken,
    files,
    uploadMode,
    defaultMonth,
    publishMatched,
}) => {
    const formData = new FormData();
    Array.from(files || []).forEach((file) => {
        formData.append('payrollFiles', file);
    });
    formData.append('uploadMode', uploadMode || 'multiple');
    formData.append('defaultMonth', defaultMonth || '');
    formData.append('publishMatched', publishMatched ? 'true' : 'false');

    const res = await fetch(`${VITE_API_URL}/payrolls/import`, {
        method: 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });
    return assertOk(await readJsonBody(res));
};

export const updatePayroll = async (authToken, payrollId, payload) => {
    const res = await fetch(`${VITE_API_URL}/payrolls/${payrollId}`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return assertOk(await readJsonBody(res));
};

export const deletePayroll = async (authToken, payrollId) => {
    const res = await fetch(`${VITE_API_URL}/payrolls/${payrollId}`, {
        method: 'DELETE',
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const openPayrollFile = async (authToken, payrollId) => {
    const res = await fetch(`${VITE_API_URL}/payrolls/${payrollId}/file`, {
        headers: { Authorization: authToken },
    });

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir la nomina');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
