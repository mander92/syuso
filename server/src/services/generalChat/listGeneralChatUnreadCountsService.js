import getPool from '../../db/getPool.js';

const listGeneralChatUnreadCountsService = async (userId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            c.id AS chatId,
            COUNT(m.id) AS unreadCount
        FROM generalChats c
        INNER JOIN generalChatMembers gm
            ON gm.chatId = c.id AND gm.userId = ?
        LEFT JOIN generalChatReads r
            ON r.chatId = c.id AND r.userId = ?
        LEFT JOIN generalChatMessages m
            ON m.chatId = c.id
            AND m.userId <> ?
            AND m.createdAt > COALESCE(r.lastReadAt, '1970-01-01')
        WHERE c.deletedAt IS NULL
        GROUP BY c.id
        `,
        [userId, userId, userId]
    );

    const counts = {};
    let total = 0;
    rows.forEach((row) => {
        const count = Number(row.unreadCount) || 0;
        counts[row.chatId] = count;
        total += count;
    });

    return { counts, total };
};

export default listGeneralChatUnreadCountsService;
