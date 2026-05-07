import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const rejectShiftSwapRequestService = async ({ requestId, adminId, reason }) => {
    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT * FROM shiftSwapRequests WHERE id = ? FOR UPDATE',
            [requestId]
        );
        if (!rows.length) generateErrorUtil('Solicitud no encontrada', 404);

        const req = rows[0];
        if (req.status !== 'pending') {
            generateErrorUtil('La solicitud ya fue resuelta', 409);
        }

        const finalReason = reason || req.reason || null;

        await conn.query(
            'UPDATE shiftSwapRequests SET status = "rejected", reason = ?, decidedBy = ?, decidedAt = NOW() WHERE id = ?',
            [finalReason, adminId, requestId]
        );

        await conn.commit();

        return {
            ...req,
            status: 'rejected',
            reason: finalReason,
            decidedBy: adminId,
            decidedAt: new Date(),
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

export default rejectShiftSwapRequestService;
