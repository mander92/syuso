const { VITE_API_URL } = import.meta.env;

const readBody = async (res, fallback = 'Error en vehiculos') => {
    const body = await res.json();
    if (!res.ok || body.status === 'error') {
        throw new Error(body.message || fallback);
    }
    return body.data;
};

export const fetchVehicles = async (authToken, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, value);
        }
    });
    const res = await fetch(`${VITE_API_URL}/vehicles?${params.toString()}`, {
        headers: { Authorization: authToken },
    });
    return readBody(res);
};

export const saveVehicle = async (authToken, payload, vehicleId = '') => {
    const res = await fetch(
        vehicleId
            ? `${VITE_API_URL}/vehicles/${vehicleId}`
            : `${VITE_API_URL}/vehicles`,
        {
            method: vehicleId ? 'PATCH' : 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );
    return readBody(res);
};

export const deleteVehicle = async (authToken, vehicleId) => {
    const res = await fetch(`${VITE_API_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: authToken },
    });
    return readBody(res);
};

export const fetchServiceVehicles = async (authToken, serviceId) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/vehicles`, {
        headers: { Authorization: authToken },
    });
    return readBody(res);
};

export const fetchVehicleInspectionStatus = async (
    authToken,
    serviceId,
    shiftRecordId
) => {
    const params = new URLSearchParams();
    if (shiftRecordId) params.set('shiftRecordId', shiftRecordId);

    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/vehicles/inspection-status?${params.toString()}`,
        {
            headers: { Authorization: authToken },
        }
    );
    return readBody(res);
};

export const assignServiceVehicles = async (authToken, serviceId, vehicleIds) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/vehicles`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleIds }),
    });
    return readBody(res);
};

export const createVehicleInspection = async ({
    authToken,
    serviceId,
    vehicleId,
    payload,
    photos = [],
    tickets = [],
}) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });
    photos.forEach((file) => formData.append('photos', file));
    tickets.forEach((file) => formData.append('tickets', file));

    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/vehicles/${vehicleId}/inspections`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
            body: formData,
        }
    );
    return readBody(res);
};
