import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import ensureServiceDelegationAccessService from '../delegations/ensureServiceDelegationAccessService.js';

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

    if (serviceRows[0].clientId === userId) {
        generateErrorUtil('Acceso denegado', 403);
    }

    const [assignedRows] = await pool.query(
        `
        SELECT id
        FROM personsAssigned
        WHERE serviceId = ? AND employeeId = ?
        `,
        [serviceId, userId]
    );

    if (!assignedRows.length) {
        const [scheduledRows] = await pool.query(
            `
            SELECT id
            FROM serviceScheduleShifts
            WHERE serviceId = ?
              AND employeeId = ?
              AND deletedAt IS NULL
            LIMIT 1
            `,
            [serviceId, userId]
        );

        if (scheduledRows.length) {
            return true;
        }

        const [shiftRecordRows] = await pool.query(
            `
            SELECT id
            FROM shiftRecords
            WHERE serviceId = ?
              AND employeeId = ?
            LIMIT 1
            `,
            [serviceId, userId]
        );

        if (!shiftRecordRows.length) {
            generateErrorUtil('Acceso denegado', 403);
        }
    }

    return true;
};

export default ensureServiceChatAccessService;
