import { useContext, useEffect, useState } from 'react';

import { AuthContext } from '../context/AuthContext.jsx';

import { fetchProfileUserServices } from '../services/userService';

import toast from 'react-hot-toast';

const useUser = () => {


    const { authToken } = useContext(AuthContext);

    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(Boolean(authToken));
    const [userError, setUserError] = useState(null);

    useEffect(() => {
        let isActive = true;

        const getUser = async () => {
            try {
                setIsLoadingUser(true);
                setUserError(null);
                const user = await fetchProfileUserServices(authToken);

                if (!isActive) return;
                setUser(user);
            } catch (err) {
                if (!isActive) return;
                setUser(null);
                setUserError(err);
                toast.error(err.message, {
                    id: 'useUser',
                });
            } finally {
                if (isActive) {
                    setIsLoadingUser(false);
                }
            }
        };

        if (authToken) {

            getUser();
        } else {
            setUser(null);
            setUserError(null);
            setIsLoadingUser(false);
        }

        return () => {
            isActive = false;
        };
    }, [authToken]);

    return { user, isLoadingUser, userError };
};

export default useUser;
