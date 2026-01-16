import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateServiceChatPausedService = async (serviceId, paused) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id
        FROM services
        WHERE id = ? AND deletedAt IS NULL
        `,
        [serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    await pool.query(
        `
        UPDATE services
        SET chatPaused = ?
        WHERE id = ?
        `,
        [paused ? 1 : 0, serviceId]
    );

    return Boolean(paused);
};

export default updateServiceChatPausedService;
