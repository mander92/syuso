import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const confirmShiftSwapRequestService = async ({ requestId, userId }) => {
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
            generateErrorUtil('Solo el compañero puede confirmar esta solicitud', 403);
        }

        if (request.status !== 'pending_counterpart') {
            generateErrorUtil('La solicitud no está pendiente de confirmación', 409);
        }

        await conn.query(
            'UPDATE shiftSwapRequests SET status = "pending_admin" WHERE id = ?',
            [requestId]
        );

        await conn.commit();

        return {
            ...request,
            status: 'pending_admin',
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export default confirmShiftSwapRequestService;
