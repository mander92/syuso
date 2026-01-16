import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { removeChatImagePath } from '../../utils/chatFileUtil.js';

const deleteServiceChatMessageService = async (serviceId, messageId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT imagePath
        FROM serviceChatMessages
        WHERE id = ? AND serviceId = ?
        `,
        [messageId, serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Mensaje no encontrado', 404);
    }

    const imagePath = rows[0].imagePath;

    await pool.query(
        `
        DELETE FROM serviceChatMessages
        WHERE id = ? AND serviceId = ?
        `,
        [messageId, serviceId]
    );

    if (imagePath) {
        await removeChatImagePath(imagePath);
    }
};

export default deleteServiceChatMessageService;
