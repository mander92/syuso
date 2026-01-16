import getPool from '../../db/getPool.js';
import { removeChatImagePath } from '../../utils/chatFileUtil.js';

const deleteServiceChatMessagesByServiceService = async (serviceId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT imagePath
        FROM serviceChatMessages
        WHERE serviceId = ? AND imagePath IS NOT NULL
        `,
        [serviceId]
    );

    await pool.query(
        `
        DELETE FROM serviceChatMessages
        WHERE serviceId = ?
        `,
        [serviceId]
    );

    if (rows.length) {
        await Promise.all(
            rows
                .map((row) => row.imagePath)
                .filter(Boolean)
                .map((imagePath) => removeChatImagePath(imagePath))
        );
    }
};

export default deleteServiceChatMessagesByServiceService;
