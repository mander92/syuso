const { VITE_API_URL } = import.meta.env;

const readBody = async (res) => {
    const body = await res.json();
    if (!res.ok || body.status === 'error') {
        throw new Error(body.message || 'Error en almacen');
    }
    return body.data;
};

export const fetchWarehouse = async (authToken, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });

    const res = await fetch(`${VITE_API_URL}/warehouse?${params.toString()}`, {
        headers: {
            Authorization: authToken,
        },
    });

    return readBody(res);
};

export const createWarehouseMovement = async (authToken, payload) => {
    const res = await fetch(`${VITE_API_URL}/warehouse/movements`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readBody(res);
};

export const deleteWarehouseMovement = async (authToken, movementId) => {
    const res = await fetch(`${VITE_API_URL}/warehouse/movements/${movementId}`, {
        method: 'DELETE',
        headers: {
            Authorization: authToken,
        },
    });

    return readBody(res);
};
