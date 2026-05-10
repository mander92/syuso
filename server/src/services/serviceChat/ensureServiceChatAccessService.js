import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensureServiceChatAccessService = async (serviceId, userId, role) => {
    const pool = await getPool();

    const [serviceRows] = await pool.query(
        `
        SELECT clientId
        FROM services
        WHERE id = ? AND deletedAt IS NULL
        `,
        [serviceId]
    );

    if (!serviceRows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    if (role === 'sudo') return true;
    if (role === 'admin') return true;

    if (role === 'client') {
        generateErrorUtil('Acceso denegado', 403);
    }

    const [accessRows] = await pool.query(
        `
        SELECT s.id
        FROM services s
        LEFT JOIN personsAssigned pa
            ON pa.serviceId = s.id AND pa.employeeId = ?
        WHERE s.id = ?
          AND s.deletedAt IS NULL
          AND (
            pa.employeeId IS NOT NULL
            OR EXISTS (
                SELECT 1
                FROM serviceScheduleShifts ss
                WHERE ss.serviceId = s.id
                  AND ss.employeeId = ?
                  AND ss.deletedAt IS NULL
            )
            OR EXISTS (
                SELECT 1
                FROM shiftRecords sr
                WHERE sr.serviceId = s.id
                  AND sr.employeeId = ?
            )
          )
        LIMIT 1
        `,
        [userId, serviceId, userId, userId]
    );

    if (!accessRows.length) {
        generateErrorUtil('Acceso denegado', 403);
    }

    return true;
};

export default ensureServiceChatAccessService;
