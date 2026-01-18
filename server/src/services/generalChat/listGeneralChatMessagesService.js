import getPool from '../../db/getPool.js';

const listGeneralChatMessagesService = async (chatId, limit = 200) => {
    const pool = await getPool();

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
        WHERE m.chatId = ?
        ORDER BY m.createdAt ASC
        LIMIT ?
        `,
        [chatId, Number(limit)]
    );

    return rows;
};

export default listGeneralChatMessagesService;
