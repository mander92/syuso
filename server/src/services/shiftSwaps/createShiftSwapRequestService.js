import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectServiceScheduleShiftByIdService from './selectServiceScheduleShiftByIdService.js';

const createShiftSwapRequestService = async ({
    serviceId,
    fromShiftId,
    toShiftId,
    requestorId,
    counterpartId,
    reason,
}) => {
    const pool = await getPool();

    // Validar que los turnos existen
    const fromShift = await selectServiceScheduleShiftByIdService(fromShiftId);
    const toShift = await selectServiceScheduleShiftByIdService(toShiftId);

    if (!fromShift || !toShift) generateErrorUtil('Turno no encontrado', 404);

    // Validar que ambos turnos pertenecen al mismo servicio
    if (fromShift.serviceId !== serviceId || toShift.serviceId !== serviceId) {
        generateErrorUtil('Los turnos no pertenecen al servicio indicado', 400);
    }

    // Validar que los empleados coinciden
    if (fromShift.employeeId !== requestorId)
        generateErrorUtil('El turno de origen no pertenece al solicitante', 400);

    if (toShift.employeeId !== counterpartId)
        generateErrorUtil('El turno destino no pertenece al compañero indicado', 400);

    // Evitar duplicados pendientes
    const [existing] = await pool.query(
        `
        SELECT id
        FROM shiftSwapRequests
        WHERE serviceId = ? AND fromShiftId = ? AND toShiftId = ? AND status = 'pending'
        `,
        [serviceId, fromShiftId, toShiftId]
    );

    if (existing.length) {
        generateErrorUtil('Ya existe una solicitud pendiente para este intercambio', 409);
    }

    const id = uuid();

    await pool.query(
        `
        INSERT INTO shiftSwapRequests
            (id, serviceId, fromShiftId, toShiftId, requestorId, counterpartId, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [id, serviceId, fromShiftId, toShiftId, requestorId, counterpartId, reason || null]
    );

    return {
        id,
        serviceId,
        fromShiftId,
        toShiftId,
        requestorId,
        counterpartId,
        status: 'pending',
        reason: reason || null,
    };
};

export default createShiftSwapRequestService;
