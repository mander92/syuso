import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensureServiceChatNotPausedService = async (serviceId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT chatPaused
        FROM services
        WHERE id = ? AND deletedAt IS NULL
        `,
        [serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    if (rows[0].chatPaused) {
        generateErrorUtil('El chat esta en pausa', 403);
    }
};

export default ensureServiceChatNotPausedService;
