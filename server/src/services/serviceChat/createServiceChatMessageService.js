import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const createServiceChatMessageService = async (
    serviceId,
    userId,
    message,
    imagePath = null,
    replyToMessageId = null
) => {
    const pool = await getPool();
    const id = uuid();

    let replyToId = replyToMessageId;

    if (replyToId) {
        const [replyRows] = await pool.query(
            `
            SELECT id
            FROM serviceChatMessages
            WHERE id = ? AND serviceId = ?
            `,
            [replyToId, serviceId]
        );

        if (!replyRows.length) {
            replyToId = null;
        }
    }

    await pool.query(
        `
        INSERT INTO serviceChatMessages (
            id,
            serviceId,
            userId,
            message,
            imagePath,
            replyToMessageId
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, serviceId, userId, message, imagePath, replyToId]
    );

    const [rows] = await pool.query(
        `
        SELECT
            m.id,
            m.serviceId,
            m.userId,
            m.message,
            m.imagePath,
            m.replyToMessageId,
            m.createdAt,
            u.firstName,
            u.lastName,
            u.role,
            r.message AS replyToMessage,
            ru.firstName AS replyToFirstName,
            ru.lastName AS replyToLastName
        FROM serviceChatMessages m
        INNER JOIN users u ON u.id = m.userId
        LEFT JOIN serviceChatMessages r ON r.id = m.replyToMessageId
        LEFT JOIN users ru ON ru.id = r.userId
        WHERE m.id = ?
        `,
        [id]
    );

    return rows[0];
};

export default createServiceChatMessageService;
