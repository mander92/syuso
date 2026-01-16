const { VITE_API_URL } = import.meta.env;

export const sendJobApplicationService = async (formData) => {
    const res = await fetch(`${VITE_API_URL}/jobs/apply`, {
        method: 'POST',
        body: formData, // 👈 IMPORTANTE: NO poner Content-Type, lo añade el navegador
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data; // { id }
};
