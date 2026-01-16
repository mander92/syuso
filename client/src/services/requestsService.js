const { VITE_API_URL } = import.meta.env;

export const sendConsultingRequestService = async ({
    fullName,
    company,
    email,
    phone,
    topic,
    message,
}) => {
    const res = await fetch(`${VITE_API_URL}/consulting`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fullName,
            company,
            email,
            phone,
            topic,
            message,
        }),
    });

    const body = await res.json();

    if (body.status === 'error') {
        throw new Error(body.message);
    }

    return body.data; // { id }
};
