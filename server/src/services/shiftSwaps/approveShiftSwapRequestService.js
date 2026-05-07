import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const parseShiftIds = (value, fallbackId) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch {
            return fallbackId ? [fallbackId] : [];
        }
    }
    return fallbackId ? [fallbackId] : [];
};

const lockShifts = async (conn, shiftIds) => {
    if (!shiftIds.length) return [];

    const [rows] = await conn.query(
        `
        SELECT id, serviceId, employeeId
        FROM serviceScheduleShifts
        WHERE id IN (?)
        FOR UPDATE
        `,
        [shiftIds]
    );

    if (rows.length !== shiftIds.length) {
        generateErrorUtil('Alguno de los turnos no existe', 404);
    }

    return rows;
};

const validateShiftOwnership = ({
    shifts,
    serviceId,
    expectedEmployeeId,
    ownerMessage,
}) => {
    for (const shift of shifts) {
        if (shift.serviceId !== serviceId) {
            generateErrorUtil('Algún turno no pertenece al servicio indicado', 400);
        }
        if (shift.employeeId !== expectedEmployeeId) {
            generateErrorUtil(ownerMessage, 400);
        }
    }
};

const updateShiftOwner = async (conn, shiftIds, employeeId) => {
    if (!shiftIds.length) return;
    await conn.query(
        'UPDATE serviceScheduleShifts SET employeeId = ? WHERE id IN (?)',
        [employeeId, shiftIds]
    );
};

const approveShiftSwapRequestService = async ({ requestId, adminId }) => {
    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [requests] = await conn.query(
            'SELECT * FROM shiftSwapRequests WHERE id = ? FOR UPDATE',
            [requestId]
        );

        if (!requests.length) generateErrorUtil('Solicitud no encontrada', 404);
        const req = requests[0];

        if (req.status !== 'pending_admin' && req.status !== 'pending') {
            generateErrorUtil('La solicitud debe estar confirmada por el compañero', 409);
        }

        const requestType = req.requestType || 'swap';
        const fromShiftIds = parseShiftIds(req.fromShiftIds, req.fromShiftId);
        const toShiftIds = parseShiftIds(req.toShiftIds, req.toShiftId);

        if ((requestType === 'transfer' || requestType === 'swap') && !fromShiftIds.length) {
            generateErrorUtil('La solicitud no tiene turnos del solicitante', 400);
        }
        if ((requestType === 'request' || requestType === 'swap') && !toShiftIds.length) {
            generateErrorUtil('La solicitud no tiene turnos del compañero', 400);
        }

        const fromShifts = await lockShifts(conn, fromShiftIds);
        const toShifts = await lockShifts(conn, toShiftIds);

        validateShiftOwnership({
            shifts: fromShifts,
            serviceId: req.serviceId,
            expectedEmployeeId: req.requestorId,
            ownerMessage: 'Algún turno de origen no pertenece al solicitante',
        });
        validateShiftOwnership({
            shifts: toShifts,
            serviceId: req.serviceId,
            expectedEmployeeId: req.counterpartId,
            ownerMessage: 'Algún turno destino no pertenece al compañero',
        });

        if (requestType === 'transfer' || requestType === 'swap') {
            await updateShiftOwner(conn, fromShiftIds, req.counterpartId);
        }

        if (requestType === 'request' || requestType === 'swap') {
            await updateShiftOwner(conn, toShiftIds, req.requestorId);
        }

        await conn.query(
            'UPDATE shiftSwapRequests SET status = "approved", decidedBy = ?, decidedAt = NOW() WHERE id = ?',
            [adminId, requestId]
        );

        await conn.commit();

        return {
            ...req,
            requestType,
            fromShiftIds,
            toShiftIds,
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
