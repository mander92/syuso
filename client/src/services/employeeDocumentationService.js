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
    if (body.status === 'error') {
        throw new Error(body.message);
    }
    return body.data;
};

export const fetchEmployeeDocumentations = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/employee-documentations`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchEmployeeSignatureDocuments = async ({
    authToken,
    employeeId = '',
} = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${VITE_API_URL}/employee-signature-documents${suffix}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const createEmployeeSignatureDocument = async ({
    authToken,
    employeeId,
    title,
    documentType,
    dueDate = '',
    periodMonth = '',
    document,
    signedDocument = null,
}) => {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('title', title);
    formData.append('documentType', documentType || 'other');
    formData.append('dueDate', dueDate || '');
    formData.append('periodMonth', periodMonth || '');
    if (document) formData.append('document', document);
    if (signedDocument) formData.append('signedDocument', signedDocument);

    const res = await fetch(`${VITE_API_URL}/employee-signature-documents`, {
        method: 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });
    return assertOk(await readJsonBody(res));
};

export const uploadEmployeeSignatureDocument = async ({
    authToken,
    documentId,
    document,
}) => {
    const formData = new FormData();
    if (document) formData.append('document', document);

    const res = await fetch(
        `${VITE_API_URL}/employee-signature-documents/${documentId}/sign`,
        {
            method: 'PUT',
            headers: { Authorization: authToken },
            body: formData,
        }
    );
    return assertOk(await readJsonBody(res));
};

export const validateEmployeeSignatureDocument = async (authToken, documentId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-signature-documents/${documentId}/validate`,
        {
            method: 'PUT',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const reopenEmployeeSignatureDocument = async (authToken, documentId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-signature-documents/${documentId}/reopen`,
        {
            method: 'PUT',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const deleteEmployeeSignatureDocument = async (authToken, documentId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-signature-documents/${documentId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const openEmployeeSignatureDocumentFile = async ({
    authToken,
    documentId,
    fileType = 'original',
}) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-signature-documents/${documentId}/files/${fileType}`,
        { headers: { Authorization: authToken } }
    );

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir el archivo');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const fetchClientDocumentations = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/client-documentations`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchClientDocumentationDrafts = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/client-documentation-drafts`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const saveClientDocumentationDraft = async ({
    authToken,
    draftId = null,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const endpoint = draftId
        ? `${VITE_API_URL}/client-documentation-drafts/${draftId}`
        : `${VITE_API_URL}/client-documentation-drafts`;

    const res = await fetch(endpoint, {
        method: draftId ? 'PUT' : 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });

    return assertOk(await readJsonBody(res));
};

export const createClientDocumentationDraftLink = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/client-documentation-drafts/${draftId}/token`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const createClientFromDocumentationDraft = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/client-documentation-drafts/${draftId}/create-client`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const deleteClientDocumentationDraft = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/client-documentation-drafts/${draftId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const openClientDocumentationDraftFile = async ({
    authToken,
    draftId,
    field,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/client-documentation-drafts/${draftId}/files/${field}`,
        { headers: { Authorization: authToken } }
    );

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir el archivo');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const fetchPublicClientDocumentationDraft = async (token) => {
    const res = await fetch(
        `${VITE_API_URL}/public/client-documentation-drafts/${token}`
    );
    return assertOk(await readJsonBody(res));
};

export const savePublicClientDocumentationDraft = async ({
    token,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const res = await fetch(
        `${VITE_API_URL}/public/client-documentation-drafts/${token}`,
        {
            method: 'PUT',
            body: formData,
        }
    );

    return assertOk(await readJsonBody(res));
};

export const saveClientDocumentation = async ({
    authToken,
    clientId = null,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const endpoint = clientId
        ? `${VITE_API_URL}/client-documentations/${clientId}`
        : `${VITE_API_URL}/client-documentations`;

    const res = await fetch(endpoint, {
        method: clientId ? 'PUT' : 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });

    return assertOk(await readJsonBody(res));
};

export const openClientDocumentationFile = async ({
    authToken,
    clientId,
    field,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/client-documentations/${clientId}/files/${field}`,
        { headers: { Authorization: authToken } }
    );

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir el archivo');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const fetchMyEmployeeDocumentation = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/employee-documentations/me`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchEmployeeDocumentation = async (authToken, userId) => {
    const res = await fetch(`${VITE_API_URL}/employee-documentations/${userId}`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const saveEmployeeDocumentation = async ({
    authToken,
    userId = null,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const endpoint = userId
        ? `${VITE_API_URL}/employee-documentations/${userId}`
        : `${VITE_API_URL}/employee-documentations/me`;

    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: authToken },
        body: formData,
    });

    return assertOk(await readJsonBody(res));
};

export const openEmployeeDocumentationFile = async ({
    authToken,
    userId,
    field,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentations/${userId}/files/${field}`,
        { headers: { Authorization: authToken } }
    );

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir el archivo');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const clearEmployeeDocumentationFile = async ({
    authToken,
    userId,
    field,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentations/${userId}/files/${field}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );

    return assertOk(await readJsonBody(res));
};

export const fetchEmployeeDocumentationDrafts = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/employee-documentation-drafts`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const saveEmployeeDocumentationDraft = async ({
    authToken,
    draftId = null,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const endpoint = draftId
        ? `${VITE_API_URL}/employee-documentation-drafts/${draftId}`
        : `${VITE_API_URL}/employee-documentation-drafts`;

    const res = await fetch(endpoint, {
        method: draftId ? 'PUT' : 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });

    return assertOk(await readJsonBody(res));
};

export const createUserFromDocumentationDraft = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentation-drafts/${draftId}/create-user`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const deleteEmployeeDocumentationDraft = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentation-drafts/${draftId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const openEmployeeDocumentationDraftFile = async ({
    authToken,
    draftId,
    field,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentation-drafts/${draftId}/files/${field}`,
        { headers: { Authorization: authToken } }
    );

    if (!res.ok) {
        const body = await readJsonBody(res);
        throw new Error(body.message || 'No se pudo abrir el archivo');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const createDocumentationDraftLink = async (authToken, draftId) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentation-drafts/${draftId}/token`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const sendDocumentationDraftLink = async ({
    authToken,
    draftId,
    emails,
}) => {
    const res = await fetch(
        `${VITE_API_URL}/employee-documentation-drafts/${draftId}/send-link`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emails }),
        }
    );
    return assertOk(await readJsonBody(res));
};

export const fetchPublicDocumentationDraft = async (token) => {
    const res = await fetch(
        `${VITE_API_URL}/public/employee-documentation-drafts/${token}`
    );
    return assertOk(await readJsonBody(res));
};

export const savePublicDocumentationDraft = async ({
    token,
    data,
    files = {},
}) => {
    const formData = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, value ?? '');
    });
    Object.entries(files || {}).forEach(([key, file]) => {
        if (file) formData.append(key, file);
    });

    const res = await fetch(
        `${VITE_API_URL}/public/employee-documentation-drafts/${token}`,
        {
            method: 'PUT',
            body: formData,
        }
    );

    return assertOk(await readJsonBody(res));
};
