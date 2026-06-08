import { useCallback, useContext, useEffect, useState } from 'react';

import { AuthContext } from '../context/AuthContext.jsx';

import { fetchProfileUserServices } from '../services/userService';
import { getChatSocket } from '../services/chatSocket.js';

import toast from 'react-hot-toast';

const useUser = () => {


    const { authToken } = useContext(AuthContext);

    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(Boolean(authToken));
    const [userError, setUserError] = useState(null);

    const refreshUser = useCallback(async ({ silent = false } = {}) => {
        if (!authToken) {
            setUser(null);
            setUserError(null);
            setIsLoadingUser(false);
            return;
        }

        try {
            if (!silent) setIsLoadingUser(true);
            setUserError(null);
            const nextUser = await fetchProfileUserServices(authToken);
            setUser(nextUser);
        } catch (err) {
            setUser(null);
            setUserError(err);
            toast.error(err.message, {
                id: 'useUser',
            });
        } finally {
            if (!silent) {
                setIsLoadingUser(false);
            }
        }
    }, [authToken]);

    useEffect(() => {
        let isActive = true;

        if (authToken) {
            refreshUser().finally(() => {
                if (!isActive) return;
            });
        } else {
            setUser(null);
            setUserError(null);
            setIsLoadingUser(false);
        }

        return () => {
            isActive = false;
        };
    }, [authToken, refreshUser]);

    useEffect(() => {
        if (!authToken || !user?.id) return;

        const socket = getChatSocket(authToken);
        if (!socket) return;

        const handleUserUpdated = (event) => {
            if (event?.userId && event.userId !== user.id) return;
            refreshUser({ silent: true });
            if (event?.dashboardPermissionsChanged) {
                toast.success('Tus accesos del dashboard se han actualizado', {
                    id: 'dashboard-permissions-updated',
                });
            }
        };

        socket.on('user:updated', handleUserUpdated);

        return () => {
            socket.off('user:updated', handleUserUpdated);
        };
    }, [authToken, user?.id, refreshUser]);

    return { user, isLoadingUser, userError };
};

export default useUser;
