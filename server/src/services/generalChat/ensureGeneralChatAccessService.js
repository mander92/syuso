import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensureGeneralChatAccessService = async (chatId, userId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT 1
        FROM generalChatMembers
        WHERE chatId = ? AND userId = ?
        `,
        [chatId, userId]
    );

    if (!rows.length) {
        generateErrorUtil('No tienes acceso a este chat', 403);
    }
};

export default ensureGeneralChatAccessService;
