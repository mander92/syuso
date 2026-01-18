import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { removeChatImagePath } from '../../utils/chatFileUtil.js';

const deleteGeneralChatMessageService = async (chatId, messageId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT imagePath
        FROM generalChatMessages
        WHERE id = ? AND chatId = ?
        `,
        [messageId, chatId]
    );

    if (!rows.length) {
        generateErrorUtil('Mensaje no encontrado', 404);
    }

    const imagePath = rows[0].imagePath;

    await pool.query(
        `
        DELETE FROM generalChatMessages
        WHERE id = ? AND chatId = ?
        `,
        [messageId, chatId]
    );

    if (imagePath) {
        await removeChatImagePath(imagePath);
    }
};

export default deleteGeneralChatMessageService;
