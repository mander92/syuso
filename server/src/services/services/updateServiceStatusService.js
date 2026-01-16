import getPool from '../../db/getPool.js';

const updateServiceStatusService = async (serviceId, status) => {
    const pool = await getPool();

    await pool.query(
        `
        UPDATE services
        SET status = ?
        WHERE id = ?
        `,
        [status, serviceId]
    );
};

export default updateServiceStatusService;
