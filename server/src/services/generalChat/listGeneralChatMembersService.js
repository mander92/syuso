import getPool from '../../db/getPool.js';

const listGeneralChatMembersService = async (chatId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT u.id, u.firstName, u.lastName, u.email, u.role
        FROM generalChatMembers m
        INNER JOIN users u ON u.id = m.userId
        WHERE m.chatId = ? AND u.deletedAt IS NULL
        ORDER BY u.role, u.firstName, u.lastName
        `,
        [chatId]
    );

    return rows;
};

export default listGeneralChatMembersService;
