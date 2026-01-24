// src/services/userServices.js
const { VITE_API_URL } = import.meta.env;

/**
 * Registro de usuario normal (cliente, empleado… vía web pública)
 */
export const fetchRegisterUserServices = async (
    email,
    firstName,
    lastName,
    dni,
    phone,
    password
) => {
    const res = await fetch(`${VITE_API_URL}/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            firstName,
            lastName,
            dni,
            phone,
            password,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

/**
 * Registro de usuario desde el panel admin
 * (admin crea clientes, empleados u otros admins)
 */
export const fetchRegisterAdminUserServices = async (
    email,
    firstName,
    lastName,
    dni,
    phone,
    job,
    city,
    role,
    delegationIds,
    authToken
) => {
    const res = await fetch(`${VITE_API_URL}/users/admin/register`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            firstName,
            lastName,
            dni,
            phone,
            job,
            city,
            role,
            delegationIds,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

/**
 * Activar usuario con código de registro
 */
export const fetchActiveUserServices = async (registrationCode) => {
    const res = await fetch(
        `${VITE_API_URL}/users/validate/${registrationCode}`
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

/**
 * Login de usuario
 */
export const fetchLoginUserServices = async (email, password) => {
    const res = await fetch(`${VITE_API_URL}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    // body suele traer token + user
    return body;
};

/**
 * Obtener perfil del usuario logueado
 */
export const fetchProfileUserServices = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/user`, {
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

/**
 * Enviar email para recuperación de contraseña
 */
export const fetchSendRecoverPasswordUserServices = async (email) => {
    const res = await fetch(`${VITE_API_URL}/users/password/recover`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

/**
 * Cambiar contraseña usando código de recuperación
 */
export const fetchChangePasswordUserServices = async (
    recoverPasswordCode,
    newPassword
) => {
    const res = await fetch(`${VITE_API_URL}/users/password`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            recoverPasswordCode,
            newPassword,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.message;
};

/**
 * Editar datos del usuario (desde su propio perfil)
 */
export const fetchEditUserServices = async (
    authToken,
    firstName,
    lastName,
    phone,
    userId
) => {
    const res = await fetch(`${VITE_API_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            firstName,
            lastName,
            phone,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

/**
 * Editar contraseña desde perfil (requiere contraseña actual)
 */
export const fetchEditPasswordUserServices = async (
    authToken,
    actualPassword,
    newPassword,
    userId
) => {
    const res = await fetch(`${VITE_API_URL}/user/password/${userId}`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            actualPassword,
            newPassword,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }
    return body;
};

/**
 * Eliminar usuario (propio o desde admin)
 */
export const fetchDeleteUserServices = async (authToken, userId) => {
    const res = await fetch(`${VITE_API_URL}/user/${userId}`, {
        method: 'DELETE',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }
    return body;
};

/**
 * Editar avatar
 */
export const fetchEditAvatarUserServices = async (
    userId,
    authToken,
    avatar
) => {
    const formData = new FormData();
    formData.append('avatar', avatar);

    const res = await fetch(`${VITE_API_URL}/user/avatar/${userId}`, {
        method: 'POST',
        headers: { Authorization: authToken },
        body: formData,
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

/**
 * Listar todos los usuarios (ADMIN) con filtros en querystring
 * searchParamsToString -> algo como "role=admin&search=juan"
 */
export const fetchAllUsersServices = async (
    searchParamsToString,
    authToken
) => {
    const res = await fetch(
        `${VITE_API_URL}/users/?${searchParamsToString}`,
        {
            headers: {
                Authorization: authToken,
                'Content-Type': 'application/json',
            },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }
    return body.data;
};

/**
 * Actualizar usuario como ADMIN (permite enviar más campos)
 * data puede incluir: { firstName, lastName, phone, dni, city, job, role, isActive, ... }
 */
export const fetchAdminUpdateUserServices = async (
    authToken,
    userId,
    data
) => {
    const res = await fetch(`${VITE_API_URL}/user/${userId}`, {
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

export const fetchAdminSetUserPasswordServices = async (
    authToken,
    userId,
    newPassword
) => {
    const res = await fetch(`${VITE_API_URL}/user/admin/password/${userId}`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};

export const fetchEmployeeRules = async (authToken, userId) => {
    const res = await fetch(`${VITE_API_URL}/users/${userId}/rules`, {
        headers: { Authorization: authToken },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const updateEmployeeRules = async (authToken, userId, rules) => {
    const res = await fetch(`${VITE_API_URL}/users/${userId}/rules`, {
        method: 'PUT',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(rules),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const fetchEmployeeAbsences = async (authToken, userId) => {
    const res = await fetch(`${VITE_API_URL}/users/${userId}/absences`, {
        headers: { Authorization: authToken },
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const createEmployeeAbsence = async (authToken, userId, payload) => {
    const res = await fetch(`${VITE_API_URL}/users/${userId}/absences`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data;
};

export const deleteEmployeeAbsence = async (authToken, userId, absenceId) => {
    const res = await fetch(
        `${VITE_API_URL}/users/${userId}/absences/${absenceId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body;
};
