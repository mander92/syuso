import { io } from 'socket.io-client';

const { VITE_API_URL } = import.meta.env;

let socketInstance = null;
let activeToken = null;

export const getChatSocket = (token) => {
    if (!token) return null;

    if (!socketInstance || activeToken !== token) {
        if (socketInstance) {
            socketInstance.disconnect();
        }

        socketInstance = io(VITE_API_URL, {
            auth: { token },
            path: '/socket.io',
            timeout: 10000,
            reconnectionAttempts: 5,
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
