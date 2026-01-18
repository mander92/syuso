import getPool from '../../db/getPool.js';

const updateGeneralChatReadService = async (chatId, userId, readAt = null) => {
    const pool = await getPool();
    const timestamp = readAt ? new Date(readAt) : new Date();

    await pool.query(
        `
        INSERT INTO generalChatReads (userId, chatId, lastReadAt)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE lastReadAt = VALUES(lastReadAt)
        `,
        [userId, chatId, timestamp]
    );
};

export default updateGeneralChatReadService;
