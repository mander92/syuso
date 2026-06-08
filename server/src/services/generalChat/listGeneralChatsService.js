import getPool from '../../db/getPool.js';

const listGeneralChatsService = async (userId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            c.id,
            c.name,
            c.type,
            c.createdBy,
            c.createdAt,
            (
                SELECT NULLIF(TRIM(CONCAT(COALESCE(u.firstName, ''), ' ', COALESCE(u.lastName, ''))), '')
                FROM generalChatMembers otherMember
                INNER JOIN users u ON u.id = otherMember.userId
                WHERE otherMember.chatId = c.id
                    AND otherMember.userId <> ?
                LIMIT 1
            ) AS directOtherName,
            (
                SELECT u.email
                FROM generalChatMembers otherMember
                INNER JOIN users u ON u.id = otherMember.userId
                WHERE otherMember.chatId = c.id
                    AND otherMember.userId <> ?
                LIMIT 1
            ) AS directOtherEmail
        FROM generalChats c
        INNER JOIN generalChatMembers m ON m.chatId = c.id
        WHERE m.userId = ? AND c.deletedAt IS NULL
        ORDER BY c.createdAt DESC
        `,
        [userId, userId, userId]
    );

    return rows;
};

export default listGeneralChatsService;
