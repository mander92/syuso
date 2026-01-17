import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createServiceNfcLogController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { shiftRecordId, tagUid, tagName, locationCoords } = req.body;

        if (!shiftRecordId || !tagUid) {
            generateErrorUtil('Faltan datos del tag', 400);
        }

        if (!Array.isArray(locationCoords) || locationCoords.length !== 2) {
            generateErrorUtil('Ubicacion invalida', 400);
        }

        const pool = await getPool();

        const [shiftRows] = await pool.query(
            `
            SELECT id, serviceId, employeeId, clockOut
            FROM shiftRecords
            WHERE id = ?
            `,
            [shiftRecordId]
        );

        if (!shiftRows.length) {
            generateErrorUtil('Turno no encontrado', 404);
        }

        const shift = shiftRows[0];
        if (shift.serviceId !== serviceId) {
            generateErrorUtil('Servicio invalido', 403);
        }

        if (shift.employeeId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        if (shift.clockOut) {
            generateErrorUtil('El turno ya esta cerrado', 409);
        }

        const [tagRows] = await pool.query(
            `
            SELECT id, tagName
            FROM serviceNfcTags
            WHERE serviceId = ? AND tagUid = ?
            `,
            [serviceId, tagUid]
        );

        const resolvedTagName =
            tagRows[0]?.tagName || tagName || 'Tag sin nombre';

        const tagId = tagRows[0]?.id || null;
        const [latitude, longitude] = locationCoords;
        const logId = uuid();

        await pool.query(
            `
            INSERT INTO serviceNfcTagLogs (
                id,
                serviceId,
                shiftRecordId,
                employeeId,
                tagId,
                tagUid,
                tagName,
                latitude,
                longitude
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                logId,
                serviceId,
                shiftRecordId,
                req.userLogged.id,
                tagId,
                tagUid,
                resolvedTagName,
                latitude,
                longitude,
            ]
        );

        res.send({
            status: 'ok',
            data: {
                id: logId,
                tagUid,
                tagName: resolvedTagName,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceNfcLogController;
