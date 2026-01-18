import getPool from '../../db/getPool.js';

const listGeneralChatsService = async (userId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT c.id, c.name, c.type, c.createdBy, c.createdAt
        FROM generalChats c
        INNER JOIN generalChatMembers m ON m.chatId = c.id
        WHERE m.userId = ? AND c.deletedAt IS NULL
        ORDER BY c.createdAt DESC
        `,
        [userId]
    );

    return rows;
};

export default listGeneralChatsService;
