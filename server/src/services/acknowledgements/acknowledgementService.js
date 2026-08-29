import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { sendPushNotificationToUsersService } from '../push/sendPushNotificationService.js';

const VALID_SUBJECT_TYPES = new Set([
    'communication',
    'service_assignment',
    'schedule',
    'document',
    'payroll',
]);

const normalizeUserIds = (userIds = []) => [
    ...new Set([].concat(userIds || []).filter(Boolean)),
];

const insertRecipientEvent = async (pool, recipientId, eventType, meta = {}) => {
    await pool.query(
        `
        INSERT INTO acknowledgementEvents (
            id, acknowledgementRecipientId, eventType, ip, userAgent
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            uuid(),
            recipientId,
            eventType,
            meta.ip || null,
            meta.userAgent || null,
        ]
    );
};

export const createAcknowledgementService = async ({
    subjectType,
    subjectId = null,
    title,
    message = '',
    url = '/account',
    requiresAcceptance = true,
    recipientUserIds = [],
    createdBy = null,
    push = true,
}) => {
    if (!VALID_SUBJECT_TYPES.has(subjectType)) {
        generateErrorUtil('Tipo de acuse no valido', 400);
    }

    const recipients = normalizeUserIds(recipientUserIds);
    if (!recipients.length) return null;

    const pool = await getPool();
    const acknowledgementId = uuid();
    const safeTitle = String(title || '').trim();
    if (!safeTitle) generateErrorUtil('Titulo requerido', 400);

    await pool.query(
        `
        INSERT INTO acknowledgements (
            id, subjectType, subjectId, title, message, url, requiresAcceptance, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            acknowledgementId,
            subjectType,
            subjectId || null,
            safeTitle,
            message || null,
            url || '/account',
            requiresAcceptance ? 1 : 0,
            createdBy || null,
        ]
    );

    for (const userId of recipients) {
        const recipientId = uuid();
        await pool.query(
            `
            INSERT IGNORE INTO acknowledgementRecipients (
                id, acknowledgementId, userId
            )
            VALUES (?, ?, ?)
            `,
            [recipientId, acknowledgementId, userId]
        );

        await insertRecipientEvent(pool, recipientId, 'delivered');
    }

    if (push) {
        void sendPushNotificationToUsersService(recipients, {
            title: safeTitle,
            body: message || 'Tienes una comunicacion pendiente de acuse.',
            url: url || '/account',
            tag: `ack-${acknowledgementId}`,
            ttl: 300,
            urgency: 'high',
        }).catch((error) => {
            console.error('[push] acknowledgement notification failed', {
                acknowledgementId,
                message: error.message,
            });
        });
    }

    return getAcknowledgementByIdService(acknowledgementId);
};

export const createAcknowledgementOnceService = async (payload) => {
    const pool = await getPool();
    const subjectId = payload.subjectId || null;
    const recipients = normalizeUserIds(payload.recipientUserIds);
    if (!subjectId || !recipients.length) {
        return createAcknowledgementService(payload);
    }

    const [existing] = await pool.query(
        `
        SELECT id
        FROM acknowledgements
        WHERE subjectType = ?
          AND subjectId = ?
          AND deletedAt IS NULL
        ORDER BY createdAt DESC
        LIMIT 1
        `,
        [payload.subjectType, subjectId]
    );

    if (!existing.length) return createAcknowledgementService(payload);

    const acknowledgementId = existing[0].id;
    for (const userId of recipients) {
        const recipientId = uuid();
        const [result] = await pool.query(
            `
            INSERT IGNORE INTO acknowledgementRecipients (
                id, acknowledgementId, userId
            )
            VALUES (?, ?, ?)
            `,
            [recipientId, acknowledgementId, userId]
        );
        if (result.affectedRows > 0) {
            await insertRecipientEvent(pool, recipientId, 'delivered');
        }
    }

    return getAcknowledgementByIdService(acknowledgementId);
};

export const listAcknowledgementsAuditService = async ({
    subjectType = '',
    status = '',
    employeeId = '',
    viewerId = '',
    viewerRole = '',
}) => {
    const pool = await getPool();
    const values = [];
    let filters = 'WHERE a.deletedAt IS NULL';

    if (subjectType) {
        filters += ' AND a.subjectType = ?';
        values.push(subjectType);
    }
    if (employeeId) {
        filters += ' AND ar.userId = ?';
        values.push(employeeId);
    }
    if (status === 'pending') {
        filters += ' AND ar.acceptedAt IS NULL';
    } else if (status === 'accepted') {
        filters += ' AND ar.acceptedAt IS NOT NULL';
    } else if (status === 'seen') {
        filters += ' AND ar.seenAt IS NOT NULL';
    }

    if (viewerRole === 'admin') {
        filters += `
            AND (
                recipient.city IN (
                    SELECT d.name
                    FROM delegations d
                    INNER JOIN adminDelegations ad ON ad.delegationId = d.id
                    WHERE ad.adminId = ?
                )
                OR a.createdBy = ?
            )
        `;
        values.push(viewerId, viewerId);
    }

    const [rows] = await pool.query(
        `
        SELECT
            a.id,
            a.subjectType,
            a.subjectId,
            a.title,
            a.message,
            a.url,
            a.requiresAcceptance,
            a.createdAt,
            creator.email AS createdByEmail,
            ar.id AS recipientId,
            ar.userId,
            ar.deliveredAt,
            ar.seenAt,
            ar.acceptedAt,
            ar.lastEventAt,
            ar.lastIp,
            ar.lastUserAgent,
            recipient.firstName,
            recipient.lastName,
            recipient.email,
            recipient.city
        FROM acknowledgements a
        INNER JOIN acknowledgementRecipients ar ON ar.acknowledgementId = a.id
        INNER JOIN users recipient ON recipient.id = ar.userId
        LEFT JOIN users creator ON creator.id = a.createdBy
        ${filters}
        ORDER BY a.createdAt DESC, recipient.firstName ASC, recipient.lastName ASC
        LIMIT 500
        `,
        values
    );

    return rows;
};

export const listMyAcknowledgementsService = async (userId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT
            a.id,
            a.subjectType,
            a.subjectId,
            a.title,
            a.message,
            a.url,
            a.requiresAcceptance,
            a.createdAt,
            ar.id AS recipientId,
            ar.deliveredAt,
            ar.seenAt,
            ar.acceptedAt
        FROM acknowledgementRecipients ar
        INNER JOIN acknowledgements a ON a.id = ar.acknowledgementId
        WHERE ar.userId = ?
          AND a.deletedAt IS NULL
        ORDER BY COALESCE(ar.acceptedAt, '1000-01-01') ASC, a.createdAt DESC
        LIMIT 200
        `,
        [userId]
    );

    return rows;
};

export const getAcknowledgementByIdService = async (acknowledgementId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT
            a.id,
            a.subjectType,
            a.subjectId,
            a.title,
            a.message,
            a.url,
            a.requiresAcceptance,
            a.createdAt,
            COUNT(ar.id) AS recipientCount,
            SUM(CASE WHEN ar.seenAt IS NOT NULL THEN 1 ELSE 0 END) AS seenCount,
            SUM(CASE WHEN ar.acceptedAt IS NOT NULL THEN 1 ELSE 0 END) AS acceptedCount
        FROM acknowledgements a
        LEFT JOIN acknowledgementRecipients ar ON ar.acknowledgementId = a.id
        WHERE a.id = ?
          AND a.deletedAt IS NULL
        GROUP BY a.id
        LIMIT 1
        `,
        [acknowledgementId]
    );

    return rows[0] || null;
};

export const markAcknowledgementEventService = async ({
    acknowledgementId,
    userId,
    eventType,
    ip = '',
    userAgent = '',
}) => {
    if (!['seen', 'accepted'].includes(eventType)) {
        generateErrorUtil('Evento de acuse no valido', 400);
    }

    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT ar.id, a.requiresAcceptance
        FROM acknowledgementRecipients ar
        INNER JOIN acknowledgements a ON a.id = ar.acknowledgementId
        WHERE ar.acknowledgementId = ?
          AND ar.userId = ?
          AND a.deletedAt IS NULL
        LIMIT 1
        `,
        [acknowledgementId, userId]
    );

    if (!rows.length) generateErrorUtil('Acuse no encontrado', 404);

    const field = eventType === 'accepted' ? 'acceptedAt' : 'seenAt';
    await pool.query(
        `
        UPDATE acknowledgementRecipients
        SET ${field} = COALESCE(${field}, CURRENT_TIMESTAMP),
            seenAt = COALESCE(seenAt, CURRENT_TIMESTAMP),
            lastEventAt = CURRENT_TIMESTAMP,
            lastIp = ?,
            lastUserAgent = ?
        WHERE id = ?
        `,
        [ip || null, userAgent || null, rows[0].id]
    );
    await insertRecipientEvent(pool, rows[0].id, eventType, { ip, userAgent });

    return { id: acknowledgementId, eventType };
};

export default {
    createAcknowledgementService,
    createAcknowledgementOnceService,
    listAcknowledgementsAuditService,
    listMyAcknowledgementsService,
    markAcknowledgementEventService,
};
