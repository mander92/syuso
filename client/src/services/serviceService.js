const { VITE_API_URL } = import.meta.env;

export const fetchNewServiceServices = async (
    authToken,
    typeOfServiceId,
    startDateTime,
    hours,
    numberOfPeople,
    address,
    postCode,
    city,
    comments
) => {
    const res = await fetch(`${VITE_API_URL}/services/${typeOfServiceId}`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            startDateTime,
            hours,
            numberOfPeople,
            address,
            postCode,
            city,
            comments,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchNewContractAdmin = async (
    authToken,
    typeOfServiceId,
    startDateTime,
    endDateTime,
    hours,
    numberOfPeople,
    comments,
    address,
    city,
    postCode,
    clientId,
    name
) => {
    const res = await fetch(`${VITE_API_URL}/services/${typeOfServiceId}`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            startDateTime,
            endDateTime,
            hours,
            numberOfPeople,
            comments,
            address,
            city,
            postCode,
            clientId,
            name
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchAllServicesServices = async (
    searchParamsToString,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/?${searchParamsToString}`,
        {
            headers: { Authorization: authToken },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchConfirmServiceServices = async (validationCode) => {
    const res = await fetch(
        `${VITE_API_URL}/services/validate/${validationCode}`
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

export const fetchDetailServiceServices = async (serviceId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}`, {
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchClientAllServicesServices = async (
    searchParamsToString,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/client/?${searchParamsToString}`,
        {
            headers: {
                Authorization: authToken,
            },
        }
    );
    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchEmployeeAllServicesServices = async (
    searchParamsToString,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/employee?${searchParamsToString}`,
        {
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchEditServiceServices = async (
    serviceId,
    data,
    authToken
) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchDeleteServiceService = async (serviceId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchUpdateServiceStatus = async (
    authToken,
    serviceId,
    status
) => {
    const res = await fetch(`${VITE_API_URL}/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchInProgressServices = async (authToken, delegationId) => {
    const query = delegationId
        ? `?delegationId=${encodeURIComponent(delegationId)}`
        : '';
    const res = await fetch(`${VITE_API_URL}/services/in-progress${query}`, {
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchActiveServiceShifts = async (
    authToken,
    serviceId
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/active-shifts`,
        {
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const uploadServiceScheduleImage = async (
    authToken,
    serviceId,
    file
) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule-image`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
            },
            body: formData,
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};
