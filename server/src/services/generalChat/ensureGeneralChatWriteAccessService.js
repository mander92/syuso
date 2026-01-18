import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensureGeneralChatWriteAccessService = async (chatId, role) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT type
        FROM generalChats
        WHERE id = ? AND deletedAt IS NULL
        `,
        [chatId]
    );

    if (!rows.length) {
        generateErrorUtil('Chat no encontrado', 404);
    }

    if (rows[0].type === 'announcement' && role !== 'admin' && role !== 'sudo') {
        generateErrorUtil('Solo administradores pueden escribir', 403);
    }
};

export default ensureGeneralChatWriteAccessService;
