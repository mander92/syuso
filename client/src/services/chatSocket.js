import { io } from 'socket.io-client';

const { VITE_API_URL, VITE_SOCKET_URL } = import.meta.env;

let socketInstance = null;
let activeToken = null;

export const getChatSocket = (token) => {
    if (!token) return null;

    if (!socketInstance || activeToken !== token) {
        if (socketInstance) {
            socketInstance.disconnect();
        }

        const apiOrigin = VITE_API_URL
            ? VITE_API_URL.replace(/\/api\/?$/, '')
            : '';
        const socketBase =
            VITE_SOCKET_URL ||
            apiOrigin ||
            (typeof window !== 'undefined'
                ? window.location.origin
                : '');

        socketInstance = io(socketBase, {
            auth: { token },
            path: '/socket.io',
            timeout: 10000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });

        activeToken = token;
    }

    return socketInstance;
};

export const disconnectChatSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        activeToken = null;
    }
};
