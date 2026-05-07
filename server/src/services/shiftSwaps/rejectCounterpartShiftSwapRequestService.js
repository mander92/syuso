import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const rejectCounterpartShiftSwapRequestService = async ({
    requestId,
    userId,
    reason,
}) => {
    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT * FROM shiftSwapRequests WHERE id = ? FOR UPDATE',
            [requestId]
        );

        if (!rows.length) generateErrorUtil('Solicitud no encontrada', 404);

        const request = rows[0];

        if (request.counterpartId !== userId) {
            generateErrorUtil('Solo el compañero puede rechazar esta solicitud', 403);
        }

        if (request.status !== 'pending_counterpart') {
            generateErrorUtil('La solicitud no está pendiente de confirmación', 409);
        }

        const finalReason = reason || request.reason || null;

        await conn.query(
            'UPDATE shiftSwapRequests SET status = "rejected", reason = ?, decidedBy = ?, decidedAt = NOW() WHERE id = ?',
            [finalReason, userId, requestId]
        );

        await conn.commit();

        return {
            ...request,
            status: 'rejected',
            reason: finalReason,
            decidedBy: userId,
            decidedAt: new Date(),
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export default rejectCounterpartShiftSwapRequestService;
