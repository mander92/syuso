const { VITE_API_URL } = import.meta.env;
const PUSH_ACTIVE_CACHE_PREFIX = 'syusoPushActiveSubscription';

const getPushActiveCacheKey = (userId) =>
    `${PUSH_ACTIVE_CACHE_PREFIX}:${userId || 'current'}`;

export const hasCachedActivePushSubscription = (userId) => {
    try {
        return Boolean(localStorage.getItem(getPushActiveCacheKey(userId)));
    } catch {
        return false;
    }
};

export const setCachedActivePushSubscription = (userId, subscription) => {
    try {
        const key = getPushActiveCacheKey(userId);
        if (subscription?.endpoint) {
            localStorage.setItem(key, subscription.endpoint);
        } else {
            localStorage.removeItem(key);
        }
    } catch {
        // Browsers can block storage in private contexts. Push still works without cache.
    }
};

const readJsonBody = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            res.ok
                ? 'La respuesta del servidor no es JSON valido'
                : `Error del servidor (${res.status})`
        );
    }
};

const assertOk = (body) => {
    if (body.status === 'error') {
        throw new Error(body.message || 'Error de notificaciones');
    }
    return body.data;
};

export const isRunningAsInstalledApp = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

export const detectPushEnvironment = () => {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isIos =
        /iphone|ipad|ipod/i.test(userAgent) ||
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(userAgent);
    const isStandalone = isRunningAsInstalledApp();
    const isSecure =
        window.isSecureContext || window.location.hostname === 'localhost';
    const supportsNotifications = 'Notification' in window;
    const supportsServiceWorker = 'serviceWorker' in navigator;
    const supportsPushManager = 'PushManager' in window;
    const needsInstallation = isIos && !isStandalone;
    const supportsPush =
        !needsInstallation &&
        isSecure &&
        supportsServiceWorker &&
        supportsPushManager &&
        supportsNotifications;

    let browserName = 'Navegador';
    if (/EdgiOS/i.test(userAgent)) browserName = 'Edge iOS';
    else if (/CriOS/i.test(userAgent)) browserName = 'Chrome iOS';
    else if (/FxiOS/i.test(userAgent)) browserName = 'Firefox iOS';
    else if (/Chrome/i.test(userAgent)) {
        browserName = 'Chrome';
    } else if (/Firefox/i.test(userAgent)) browserName = 'Firefox';
    else if (/Safari/i.test(userAgent)) {
        browserName = 'Safari';
    }
    if (/Edg/i.test(userAgent) && !/EdgiOS/i.test(userAgent)) {
        browserName = 'Edge';
    }

    return {
        browserName,
        deviceType: isIos ? 'ios' : isAndroid ? 'android' : 'desktop',
        isAndroid,
        isIos,
        isStandalone,
        isSecure,
        supportsNotifications,
        supportsServiceWorker,
        supportsPushManager,
        supportsPush,
        needsInstallation,
        canRequestPermission: supportsPush,
        permission:
            'Notification' in window ? Notification.permission : 'unsupported',
        userAgent,
    };
};

export const fetchPushConfig = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/push/config`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchPushSubscriptions = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/push/subscriptions`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const fetchPushAdminSummary = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/push/admin/users`, {
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const arrayBuffersEqual = (left, right) => {
    if (!left || !right || left.byteLength !== right.byteLength) return false;
    const leftView = new Uint8Array(left);
    const rightView = new Uint8Array(right);
    return leftView.every((value, index) => value === rightView[index]);
};

export const getPushServiceWorkerRegistration = async () =>
    navigator.serviceWorker.register('/push-sw.js');

export const getCurrentBrowserSubscription = async () => {
    const registration = await getPushServiceWorkerRegistration();
    return registration.pushManager.getSubscription();
};

export const getCurrentPushSubscriptionJson = async () => {
    const subscription = await getCurrentBrowserSubscription();
    return subscription?.toJSON() || null;
};

export const registerCurrentDeviceForPush = async ({
    authToken,
    vapidPublicKey,
}) => {
    const env = detectPushEnvironment();
    if (env.needsInstallation) {
        throw new Error(
            'Primero anade la aplicacion a la pantalla de inicio y abrela desde el nuevo icono.'
        );
    }
    if (!env.supportsPush) {
        throw new Error('Este dispositivo no permite avisos del navegador.');
    }
    if (!vapidPublicKey) {
        throw new Error('Las notificaciones no estan configuradas en el servidor.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('No se han permitido las notificaciones.');
    }

    const registration = await getPushServiceWorkerRegistration();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (
        subscription?.options?.applicationServerKey &&
        !arrayBuffersEqual(
            subscription.options.applicationServerKey,
            applicationServerKey
        )
    ) {
        await subscription.unsubscribe();
        subscription = null;
    }

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });
    }

    const res = await fetch(`${VITE_API_URL}/push/subscriptions`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            device: {
                deviceName:
                    env.deviceType === 'ios'
                        ? 'iPhone / iPad'
                        : env.deviceType === 'android'
                          ? 'Android'
                          : 'Ordenador',
                deviceType: env.deviceType,
                browserName: env.browserName,
                userAgent: env.userAgent,
            },
        }),
    });
    return assertOk(await readJsonBody(res));
};

export const disablePushSubscription = async ({ authToken, subscriptionId }) => {
    const res = await fetch(
        `${VITE_API_URL}/push/subscriptions/${subscriptionId}/disable`,
        {
            method: 'POST',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const deletePushSubscription = async ({ authToken, subscriptionId }) => {
    const res = await fetch(
        `${VITE_API_URL}/push/subscriptions/${subscriptionId}`,
        {
            method: 'DELETE',
            headers: { Authorization: authToken },
        }
    );
    return assertOk(await readJsonBody(res));
};

export const sendTestPushNotification = async (authToken) => {
    const res = await fetch(`${VITE_API_URL}/push/test`, {
        method: 'POST',
        headers: { Authorization: authToken },
    });
    return assertOk(await readJsonBody(res));
};

export const sendCurrentDeviceTestPushNotification = async ({
    authToken,
    endpoint,
}) => {
    const res = await fetch(`${VITE_API_URL}/push/test-current`, {
        method: 'POST',
        headers: {
            Authorization: authToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
    });
    return assertOk(await readJsonBody(res));
};
