import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const approveShiftSwapRequestService = async ({ requestId, adminId }) => {
    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Bloqueamos la solicitud
        const [requests] = await conn.query(
            'SELECT * FROM shiftSwapRequests WHERE id = ? FOR UPDATE',
            [requestId]
        );

        if (!requests.length) generateErrorUtil('Solicitud no encontrada', 404);
        const req = requests[0];

        if (req.status !== 'pending') {
            generateErrorUtil('La solicitud ya fue resuelta', 409);
        }

        // Bloqueamos ambos turnos para evitar condiciones de carrera
        const [fromShiftRows] = await conn.query(
            'SELECT id, employeeId FROM serviceScheduleShifts WHERE id = ? FOR UPDATE',
            [req.fromShiftId]
        );
        const [toShiftRows] = await conn.query(
            'SELECT id, employeeId FROM serviceScheduleShifts WHERE id = ? FOR UPDATE',
            [req.toShiftId]
        );

        if (!fromShiftRows.length || !toShiftRows.length) {
            generateErrorUtil('Alguno de los turnos no existe', 404);
        }

        const fromShift = fromShiftRows[0];
        const toShift = toShiftRows[0];

        // Validamos que los turnos pertenecen a los usuarios esperados
        if (fromShift.employeeId !== req.requestorId) {
            generateErrorUtil('El turno de origen no pertenece al solicitante', 400);
        }
        if (toShift.employeeId !== req.counterpartId) {
            generateErrorUtil('El turno destino no pertenece al compañero', 400);
        }

        // Intercambiamos los empleados en los turnos
        await conn.query(
            'UPDATE serviceScheduleShifts SET employeeId = ? WHERE id = ?',
            [req.counterpartId, req.fromShiftId]
        );
        await conn.query(
            'UPDATE serviceScheduleShifts SET employeeId = ? WHERE id = ?',
            [req.requestorId, req.toShiftId]
        );

        // Marcamos la solicitud como aprobada
        await conn.query(
            'UPDATE shiftSwapRequests SET status = "approved", decidedBy = ?, decidedAt = NOW() WHERE id = ?',
            [adminId, requestId]
        );

        await conn.commit();

        return {
            ...req,
            status: 'approved',
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

export default approveShiftSwapRequestService;
