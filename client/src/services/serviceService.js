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

export const fetchServiceScheduleTemplates = async (
    authToken,
    serviceId,
    month
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/templates?month=${encodeURIComponent(
            month
        )}`,
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

export const fetchServiceShiftTypes = async (authToken, serviceId) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/shift-types`,
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

export const createServiceShiftType = async (
    authToken,
    serviceId,
    payload
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/shift-types`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const updateServiceShiftType = async (
    authToken,
    serviceId,
    shiftTypeId,
    payload
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/shift-types/${shiftTypeId}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const deleteServiceShiftType = async (
    authToken,
    serviceId,
    shiftTypeId
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/shift-types/${shiftTypeId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const saveServiceScheduleTemplates = async (
    authToken,
    serviceId,
    month,
    templates
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/templates`,
        {
            method: 'PUT',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ month, templates }),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const applyServiceScheduleTemplate = async (
    authToken,
    serviceId,
    month,
    startDate
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/apply-template`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ month, startDate }),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchServiceScheduleShifts = async (
    authToken,
    serviceId,
    month
) => {
    const url = month
        ? `${VITE_API_URL}/services/${serviceId}/schedule/shifts?month=${encodeURIComponent(
              month
          )}`
        : `${VITE_API_URL}/services/${serviceId}/schedule/shifts`;
    const res = await fetch(url, {
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

const getDownloadFileName = (contentDisposition, fallback) => {
    if (!contentDisposition) return fallback;
    const match = contentDisposition.match(/filename="([^"]+)"/i);
    return match?.[1] || fallback;
};

const downloadScheduleFile = async (authToken, url, fallbackName) => {
    const res = await fetch(url, {
        headers: {
            Authorization: authToken,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'No se pudo descargar el archivo');
    }

    const blob = await res.blob();
    const fileName = getDownloadFileName(
        res.headers.get('content-disposition'),
        fallbackName
    );

    return { blob, fileName };
};

export const downloadServiceSchedulePdf = async (
    authToken,
    serviceId,
    month
) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    const url = params.toString()
        ? `${VITE_API_URL}/services/${serviceId}/schedule/pdf?${params.toString()}`
        : `${VITE_API_URL}/services/${serviceId}/schedule/pdf`;
    return downloadScheduleFile(authToken, url, 'cuadrante_servicio.pdf');
};

export const downloadServiceScheduleZip = async (
    authToken,
    serviceIds,
    month
) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (Array.isArray(serviceIds) && serviceIds.length) {
        params.append('serviceIds', serviceIds.join(','));
    }
    const url = params.toString()
        ? `${VITE_API_URL}/services/schedule/zip?${params.toString()}`
        : `${VITE_API_URL}/services/schedule/zip`;
    return downloadScheduleFile(authToken, url, 'cuadrantes_servicios.zip');
};

export const downloadEmployeeSchedulePdf = async (
    authToken,
    month,
    employeeId = ''
) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (employeeId) params.append('employeeId', employeeId);
    const url = params.toString()
        ? `${VITE_API_URL}/services/employee/schedule/pdf?${params.toString()}`
        : `${VITE_API_URL}/services/employee/schedule/pdf`;
    return downloadScheduleFile(authToken, url, 'cuadrante_personal.pdf');
};

export const downloadEmployeeScheduleZip = async (
    authToken,
    month,
    employeeIds = []
) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (Array.isArray(employeeIds) && employeeIds.length) {
        params.append('employeeIds', employeeIds.join(','));
    }
    const url = params.toString()
        ? `${VITE_API_URL}/services/employee/schedule/zip?${params.toString()}`
        : `${VITE_API_URL}/services/employee/schedule/zip`;
    return downloadScheduleFile(authToken, url, 'cuadrantes_personales.zip');
};

export const createServiceScheduleShift = async (
    authToken,
    serviceId,
    payload
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/shifts`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const updateServiceScheduleShift = async (
    authToken,
    serviceId,
    shiftId,
    payload
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/shifts/${shiftId}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const deleteServiceScheduleShift = async (
    authToken,
    serviceId,
    shiftId
) => {
    const res = await fetch(
        `${VITE_API_URL}/services/${serviceId}/schedule/shifts/${shiftId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: authToken,
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchEmployeeScheduleShifts = async (
    authToken,
    month,
    generateExcel = false,
    serviceId = ''
) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (generateExcel) params.append('generateExcel', '1');
    if (serviceId) params.append('serviceId', serviceId);
    const url = params.toString()
        ? `${VITE_API_URL}/services/employee/schedule?${params.toString()}`
        : `${VITE_API_URL}/services/employee/schedule`;
    const res = await fetch(url, {
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
