import getPool from '../../db/getPool.js';

const listServiceChatMessagesService = async (serviceId, limit = 200) => {
    const pool = await getPool();

    const [serviceRows] = await pool.query(
        `
        SELECT chatPaused
        FROM services
        WHERE id = ? AND deletedAt IS NULL
        `,
        [serviceId]
    );

    const chatPaused = Boolean(serviceRows[0]?.chatPaused);

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
        WHERE m.serviceId = ?
        ORDER BY m.createdAt ASC
        LIMIT ?
        `,
        [serviceId, Number(limit)]
    );

    return { messages: rows, chatPaused };
};

export default listServiceChatMessagesService;
