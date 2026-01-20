import getPool from '../../db/getPool.js';

const deleteGeneralChatService = async (chatId) => {
    const pool = await getPool();

    await pool.query(
        `
        UPDATE generalChats
        SET deletedAt = NOW()
        WHERE id = ?
        `,
        [chatId]
    );
};

export default deleteGeneralChatService;
