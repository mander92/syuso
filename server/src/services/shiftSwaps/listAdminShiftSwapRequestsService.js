import getPool from '../../db/getPool.js';

const listAdminShiftSwapRequestsService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            ssr.id,
            ssr.serviceId,
            ssr.fromShiftId,
            ssr.toShiftId,
            ssr.requestorId,
            ssr.counterpartId,
            ssr.status,
            ssr.reason,
            ssr.decidedBy,
            ssr.decidedAt,
            ssr.createdAt
        FROM shiftSwapRequests ssr
        ORDER BY ssr.createdAt DESC
        `
    );

    return rows;
};

export default listAdminShiftSwapRequestsService;
