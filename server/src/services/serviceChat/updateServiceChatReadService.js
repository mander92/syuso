import getPool from '../../db/getPool.js';

const updateServiceChatReadService = async (serviceId, userId, readAt = null) => {
    const pool = await getPool();
    const timestamp = readAt ? new Date(readAt) : new Date();

    await pool.query(
        `
        INSERT INTO serviceChatReads (userId, serviceId, lastReadAt)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE lastReadAt = VALUES(lastReadAt)
        `,
        [userId, serviceId, timestamp]
    );
};

export default updateServiceChatReadService;
