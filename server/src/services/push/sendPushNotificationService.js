import webpush from 'web-push';

import {
    CLIENT_URL,
    VAPID_PRIVATE_KEY,
    VAPID_PUBLIC_KEY,
    VAPID_SUBJECT,
} from '../../../env.js';
import {
    listActivePushSubscriptionsForUsersService,
    markPushSubscriptionInvalidService,
    markPushSubscriptionUsedService,
} from './pushSubscriptionService.js';

let webPushConfigured = false;

const configureWebPush = () => {
    if (webPushConfigured) return true;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

    webpush.setVapidDetails(
        VAPID_SUBJECT || 'mailto:admin@syuso.es',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    webPushConfigured = true;
    return true;
};

const normalizeUrl = (url = '/') => {
    if (!url) return '/account';
    if (/^https?:\/\//i.test(url)) return url;
    return `${CLIENT_URL || ''}${url.startsWith('/') ? url : `/${url}`}`;
};

const getEndpointDomain = (endpoint = '') => {
    try {
        return new URL(endpoint).hostname;
    } catch {
        return 'endpoint-no-valido';
    }
};

const buildPayload = (notification = {}) =>
    JSON.stringify({
        title: notification.title || 'SYUSO Seguridad',
        body: notification.body || 'Tienes un nuevo aviso.',
        url: normalizeUrl(notification.url || '/account'),
        tag: notification.tag || 'syuso-notification',
        icon: notification.icon || '/syusoLogo.jpg',
        timestamp: Date.now(),
    });

const buildPushOptions = (notification = {}) => ({
    TTL: notification.ttl ?? 60,
    headers: {
        Urgency: notification.urgency || 'high',
        ...(notification.topic ? { Topic: notification.topic } : {}),
    },
});

const sendPushNotificationToSubscriptionRow = async (
    row,
    payload,
    pushOptions
) => {
    const diagnostic = {
        id: row.id,
        userId: row.userId,
        deviceName: row.deviceName || 'Dispositivo',
        deviceType: row.deviceType || 'unknown',
        browserName: row.browserName || '',
        endpointDomain: getEndpointDomain(row.endpoint),
        timestamp: new Date().toISOString(),
    };
    const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
            p256dh: row.p256dh,
            auth: row.auth,
        },
    };

    try {
        const response = await webpush.sendNotification(
            pushSubscription,
            payload,
            pushOptions
        );
        await markPushSubscriptionUsedService(row.id);
        const result = {
            ...diagnostic,
            status: 'sent',
            httpStatus: response?.statusCode || 201,
            responseBody: response?.body || '',
        };
        if (process.env.PUSH_DEBUG === '1') {
            console.log('[push] sent', result);
        }
        return result;
    } catch (error) {
        const isInvalid = error?.statusCode === 404 || error?.statusCode === 410;
        if (isInvalid) {
            await markPushSubscriptionInvalidService(row.id);
        }
        const result = {
            ...diagnostic,
            status: isInvalid ? 'disabled' : 'failed',
            httpStatus: error?.statusCode || null,
            responseBody: error?.body || '',
            message: error.message,
        };
        if (process.env.PUSH_DEBUG === '1') {
            console.error('[push] failed', result);
        }
        return result;
    }
};

export const sendPushNotificationToUsersService = async (
    userIds,
    notification = {}
) => {
    const normalizedUserIds = [...new Set([].concat(userIds || []).filter(Boolean))];
    if (!normalizedUserIds.length) {
        return { sent: 0, failed: 0, disabled: 0, results: [] };
    }

    if (!configureWebPush()) {
        return {
            sent: 0,
            failed: 0,
            disabled: 0,
            results: [],
            skipped: true,
            reason: 'VAPID keys not configured',
        };
    }

    const subscriptions =
        await listActivePushSubscriptionsForUsersService(normalizedUserIds);
    const payload = buildPayload(notification);
    const pushOptions = buildPushOptions(notification);

    const results = await Promise.all(
        subscriptions.map((row) =>
            sendPushNotificationToSubscriptionRow(row, payload, pushOptions)
        )
    );

    return {
        sent: results.filter((item) => item.status === 'sent').length,
        failed: results.filter((item) => item.status === 'failed').length,
        disabled: results.filter((item) => item.status === 'disabled').length,
        results,
    };
};

export const sendPushNotificationToUserService = async (userId, notification) =>
    sendPushNotificationToUsersService([userId], notification);

export const sendPushNotificationToSubscriptionService = async (
    subscription,
    notification = {}
) => {
    if (!subscription) {
        return { sent: 0, failed: 0, disabled: 0, results: [] };
    }

    if (!configureWebPush()) {
        return {
            sent: 0,
            failed: 0,
            disabled: 0,
            results: [],
            skipped: true,
            reason: 'VAPID keys not configured',
        };
    }

    const payload = buildPayload(notification);
    const pushOptions = buildPushOptions(notification);
    const result = await sendPushNotificationToSubscriptionRow(
        subscription,
        payload,
        pushOptions
    );

    return {
        sent: result.status === 'sent' ? 1 : 0,
        failed: result.status === 'failed' ? 1 : 0,
        disabled: result.status === 'disabled' ? 1 : 0,
        results: [result],
    };
};
