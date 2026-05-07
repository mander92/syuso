import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectServiceScheduleShiftByIdService from './selectServiceScheduleShiftByIdService.js';

const uniqueIds = (ids) => [...new Set((ids || []).filter(Boolean))];

const normalizeShiftIds = ({ singleId, ids }) =>
    uniqueIds([...(ids || []), ...(singleId ? [singleId] : [])]);

const validateShiftGroup = async ({
    serviceId,
    shiftIds,
    expectedEmployeeId,
    missingMessage,
    ownerMessage,
}) => {
    const shifts = [];

    for (const shiftId of shiftIds) {
        const shift = await selectServiceScheduleShiftByIdService(shiftId);
        if (!shift) generateErrorUtil(missingMessage, 404);
        if (shift.serviceId !== serviceId) {
            generateErrorUtil('Los turnos no pertenecen al servicio indicado', 400);
        }
        if (shift.employeeId !== expectedEmployeeId) {
            generateErrorUtil(ownerMessage, 400);
        }
        shifts.push(shift);
    }

    return shifts;
};

const createShiftSwapRequestService = async ({
    serviceId,
    requestType = 'swap',
    fromShiftId,
    toShiftId,
    fromShiftIds,
    toShiftIds,
    requestorId,
    counterpartId,
    reason,
}) => {
    const pool = await getPool();
    const normalizedType = requestType || 'swap';
    const normalizedFromShiftIds = normalizeShiftIds({
        singleId: fromShiftId,
        ids: fromShiftIds,
    });
    const normalizedToShiftIds = normalizeShiftIds({
        singleId: toShiftId,
        ids: toShiftIds,
    });

    if (counterpartId === requestorId) {
        generateErrorUtil('Selecciona un compañero distinto', 400);
    }

    if (
        (normalizedType === 'transfer' || normalizedType === 'swap') &&
        !normalizedFromShiftIds.length
    ) {
        generateErrorUtil('Selecciona al menos uno de tus turnos', 400);
    }

    if (
        (normalizedType === 'request' || normalizedType === 'swap') &&
        !normalizedToShiftIds.length
    ) {
        generateErrorUtil('Selecciona al menos un turno del compañero', 400);
    }

    await validateShiftGroup({
        serviceId,
        shiftIds: normalizedFromShiftIds,
        expectedEmployeeId: requestorId,
        missingMessage: 'Turno de origen no encontrado',
        ownerMessage: 'Algún turno de origen no pertenece al solicitante',
    });

    await validateShiftGroup({
        serviceId,
        shiftIds: normalizedToShiftIds,
        expectedEmployeeId: counterpartId,
        missingMessage: 'Turno del compañero no encontrado',
        ownerMessage: 'Algún turno destino no pertenece al compañero indicado',
    });

    const fromJson = JSON.stringify(normalizedFromShiftIds);
    const toJson = JSON.stringify(normalizedToShiftIds);

    const [existing] = await pool.query(
        `
        SELECT id
        FROM shiftSwapRequests
        WHERE serviceId = ?
          AND requestType = ?
          AND requestorId = ?
          AND counterpartId = ?
          AND JSON_UNQUOTE(JSON_EXTRACT(fromShiftIds, '$')) = ?
          AND JSON_UNQUOTE(JSON_EXTRACT(toShiftIds, '$')) = ?
          AND status IN ('pending_counterpart', 'pending_admin', 'pending')
        `,
        [serviceId, normalizedType, requestorId, counterpartId, fromJson, toJson]
    );

    if (existing.length) {
        generateErrorUtil('Ya existe una solicitud pendiente igual', 409);
    }

    const id = uuid();
    const firstFromShiftId = normalizedFromShiftIds[0] || null;
    const firstToShiftId = normalizedToShiftIds[0] || null;

    await pool.query(
        `
        INSERT INTO shiftSwapRequests
            (
                id,
                serviceId,
                requestType,
                fromShiftId,
                toShiftId,
                fromShiftIds,
                toShiftIds,
                requestorId,
                counterpartId,
                reason
            )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            serviceId,
            normalizedType,
            firstFromShiftId,
            firstToShiftId,
            fromJson,
            toJson,
            requestorId,
            counterpartId,
            reason || null,
        ]
    );

    await pool.query(
        'UPDATE shiftSwapRequests SET status = "pending_counterpart" WHERE id = ?',
        [id]
    );

    return {
        id,
        serviceId,
        requestType: normalizedType,
        fromShiftId: firstFromShiftId,
        toShiftId: firstToShiftId,
        fromShiftIds: normalizedFromShiftIds,
        toShiftIds: normalizedToShiftIds,
        requestorId,
        counterpartId,
        status: 'pending_counterpart',
        reason: reason || null,
    };
};

export default createShiftSwapRequestService;
