import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const hashEndpoint = (endpoint) =>
    crypto.createHash('sha256').update(endpoint).digest('hex');

export const normalizePushSubscriptionRow = (row) => ({
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    deviceName: row.deviceName || 'Dispositivo',
    deviceType: row.deviceType || 'unknown',
    browserName: row.browserName || '',
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    modifiedAt: row.modifiedAt,
    lastUsedAt: row.lastUsedAt,
});

export const listPushSubscriptionsByUserService = async (userId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
            SELECT *
            FROM pushSubscriptions
            WHERE userId = ?
              AND deletedAt IS NULL
            ORDER BY enabled DESC, modifiedAt DESC, createdAt DESC
        `,
        [userId]
    );

    return rows.map(normalizePushSubscriptionRow);
};

export const listActivePushSubscriptionsForUsersService = async (userIds) => {
    if (!userIds.length) return [];
    const pool = await getPool();
    const [rows] = await pool.query(
        `
            SELECT *
            FROM pushSubscriptions
            WHERE userId IN (?)
              AND enabled = true
              AND deletedAt IS NULL
        `,
        [userIds]
    );

    return rows;
};

export const upsertPushSubscriptionService = async ({
    userId,
    subscription,
    device = {},
}) => {
    const endpointHash = hashEndpoint(subscription.endpoint);
    const keys = subscription.keys || {};
    const pool = await getPool();

    const [existingRows] = await pool.query(
        `
            SELECT id
            FROM pushSubscriptions
            WHERE endpointHash = ?
            LIMIT 1
        `,
        [endpointHash]
    );

    if (existingRows[0]) {
        await pool.query(
            `
                UPDATE pushSubscriptions
                SET userId = ?,
                    endpoint = ?,
                    p256dh = ?,
                    auth = ?,
                    deviceName = ?,
                    deviceType = ?,
                    browserName = ?,
                    userAgent = ?,
                    enabled = true,
                    deletedAt = NULL
                WHERE id = ?
            `,
            [
                userId,
                subscription.endpoint,
                keys.p256dh,
                keys.auth,
                device.deviceName || null,
                device.deviceType || 'unknown',
                device.browserName || null,
                device.userAgent || null,
                existingRows[0].id,
            ]
        );
        return existingRows[0].id;
    }

    const id = uuid();
    await pool.query(
        `
            INSERT INTO pushSubscriptions (
                id, userId, endpoint, endpointHash, p256dh, auth,
                deviceName, deviceType, browserName, userAgent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            userId,
            subscription.endpoint,
            endpointHash,
            keys.p256dh,
            keys.auth,
            device.deviceName || null,
            device.deviceType || 'unknown',
            device.browserName || null,
            device.userAgent || null,
        ]
    );

    return id;
};

export const disablePushSubscriptionService = async ({ userId, id }) => {
    const pool = await getPool();
    const [result] = await pool.query(
        `
            UPDATE pushSubscriptions
            SET enabled = false
            WHERE id = ?
              AND userId = ?
              AND deletedAt IS NULL
        `,
        [id, userId]
    );

    return result.affectedRows > 0;
};

export const deletePushSubscriptionService = async ({ userId, id }) => {
    const pool = await getPool();
    const [result] = await pool.query(
        `
            UPDATE pushSubscriptions
            SET enabled = false,
                deletedAt = CURRENT_TIMESTAMP
            WHERE id = ?
              AND userId = ?
              AND deletedAt IS NULL
        `,
        [id, userId]
    );

    return result.affectedRows > 0;
};

export const markPushSubscriptionInvalidService = async (id) => {
    const pool = await getPool();
    await pool.query(
        `
            UPDATE pushSubscriptions
            SET enabled = false,
                deletedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        [id]
    );
};

export const markPushSubscriptionUsedService = async (id) => {
    const pool = await getPool();
    await pool.query(
        `
            UPDATE pushSubscriptions
            SET lastUsedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        [id]
    );
};

export const listPushAdminSummaryService = async () => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
            SELECT
                u.id AS userId,
                u.firstName,
                u.lastName,
                u.email,
                u.role,
                COUNT(ps.id) AS deviceCount,
                SUM(CASE WHEN ps.enabled = true THEN 1 ELSE 0 END) AS activeDeviceCount
            FROM users u
            LEFT JOIN pushSubscriptions ps
                ON ps.userId = u.id
               AND ps.deletedAt IS NULL
            WHERE u.deletedAt IS NULL
              AND u.role = 'employee'
            GROUP BY u.id
            ORDER BY u.firstName, u.lastName, u.email
        `
    );

    return rows.map((row) => ({
        userId: row.userId,
        name:
            `${row.firstName || ''} ${row.lastName || ''}`.trim() ||
            row.email ||
            'Trabajador',
        email: row.email,
        role: row.role,
        deviceCount: Number(row.deviceCount || 0),
        activeDeviceCount: Number(row.activeDeviceCount || 0),
        status: Number(row.activeDeviceCount || 0) > 0 ? 'active' : 'missing',
    }));
};
