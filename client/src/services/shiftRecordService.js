const { VITE_API_URL } = import.meta.env;

export const fetchShiftRecordsAdmin = async (searchParamsToString, authToken) => {
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords?${searchParamsToString}`,
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

export const fetchShiftRecordsEmployee = async (
    searchParamsToString,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords/employee?${searchParamsToString}`,
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

export const fetchStartShiftRecord = async (
    authToken,
    serviceId,
    employeeId,
    location,
    clockIn
) => {
    const res = await fetch(`${VITE_API_URL}/shiftRecords/clockIn`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            serviceId,
            employeeId,
            location,
            clockIn,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchEndShiftRecord = async (
    authToken,
    shiftRecordId,
    serviceId,
    employeeId,
    location,
    clockOut
) => {
    const res = await fetch(`${VITE_API_URL}/shiftRecords/${shiftRecordId}`, {
        method: 'PATCH',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            serviceId,
            employeeId,
            location,
            clockOut,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchShiftRecordDetail = async (shiftRecordId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/shiftRecords/${shiftRecordId}`, {
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

export const fetchUpdateShiftRecord = async (
    shiftRecordId,
    authToken,
    clockIn,
    clockOut
) => {
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords/edit/${shiftRecordId}`,
        {
            method: 'PUT',
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clockIn, clockOut }),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchCreateShiftRecord = async (
    authToken,
    serviceId,
    employeeId,
    clockIn,
    clockOut
) => {
    const res = await fetch(`${VITE_API_URL}/shiftRecords/${serviceId}`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId, clockIn, clockOut }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchDeleteShiftRecord = async (shiftRecordId, authToken) => {
    const res = await fetch(`${VITE_API_URL}/shiftRecords/${shiftRecordId}`, {
        method: 'DELETE',
        headers: {
            Authorization: authToken,
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};


export const fetchCreateWorkReport = async (
    shiftRecordId,
    authToken,
    payload
) => {
    const isFormData = payload instanceof FormData;
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords/${shiftRecordId}/report`,
        {
            method: 'POST',
            headers: isFormData
                ? { Authorization: authToken }
                : {
                      Authorization: authToken,
                      'Content-Type': 'application/json',
                  },
            body: isFormData ? payload : JSON.stringify(payload),
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchWorkReportDraft = async (shiftRecordId, authToken) => {
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords/${shiftRecordId}/report/draft`,
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

export const fetchSaveWorkReportDraft = async (
    shiftRecordId,
    authToken,
    payload
) => {
    const res = await fetch(
        `${VITE_API_URL}/shiftRecords/${shiftRecordId}/report/draft`,
        {
            method: 'POST',
            headers: {
                Authorization: authToken,
            },
            body: payload,
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};
