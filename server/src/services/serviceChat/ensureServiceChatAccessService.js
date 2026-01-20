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
        generateErrorUtil('Acceso denegado', 403);
    }

    return true;
};

export default ensureServiceChatAccessService;
