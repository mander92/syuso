import getPool from '../../db/getPool.js';

const listUserShiftSwapRequestsService = async (userId) => {
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
        WHERE ssr.requestorId = ? OR ssr.counterpartId = ?
        ORDER BY ssr.createdAt DESC
        `,
        [userId, userId]
    );

    return rows;
};

export default listUserShiftSwapRequestsService;

