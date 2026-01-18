import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const createGeneralChatMessageService = async (
    chatId,
    userId,
    message,
    imagePath,
    replyToMessageId
) => {
    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
        INSERT INTO generalChatMessages (
            id,
            chatId,
            userId,
            message,
            imagePath,
            replyToMessageId
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, chatId, userId, message, imagePath, replyToMessageId]
    );

    const [rows] = await pool.query(
        `
        SELECT
            m.id,
            m.chatId,
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
        FROM generalChatMessages m
        INNER JOIN users u ON u.id = m.userId
        LEFT JOIN generalChatMessages r ON r.id = m.replyToMessageId
        LEFT JOIN users ru ON ru.id = r.userId
        WHERE m.id = ?
        `,
        [id]
    );

    return rows[0];
};

export default createGeneralChatMessageService;
