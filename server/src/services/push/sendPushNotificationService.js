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
    const payload = JSON.stringify({
        title: notification.title || 'SYUSO Seguridad',
        body: notification.body || 'Tienes un nuevo aviso.',
        url: normalizeUrl(notification.url || '/account'),
        tag: notification.tag || 'syuso-notification',
        icon: notification.icon || '/syusoLogo.jpg',
    });

    const results = await Promise.all(
        subscriptions.map(async (row) => {
            const pushSubscription = {
                endpoint: row.endpoint,
                keys: {
                    p256dh: row.p256dh,
                    auth: row.auth,
                },
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
                await markPushSubscriptionUsedService(row.id);
                return { id: row.id, userId: row.userId, status: 'sent' };
            } catch (error) {
                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    await markPushSubscriptionInvalidService(row.id);
                    return {
                        id: row.id,
                        userId: row.userId,
                        status: 'disabled',
                    };
                }
                return {
                    id: row.id,
                    userId: row.userId,
                    status: 'failed',
                    message: error.message,
                };
            }
        })
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
