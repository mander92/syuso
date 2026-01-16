import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectAdminDelegationNamesService from './selectAdminDelegationNamesService.js';

const ensureServiceDelegationAccessService = async (
    serviceId,
    userId,
    role
) => {
    if (role === 'sudo') return true;
    if (role !== 'admin') return true;

    const delegations = await selectAdminDelegationNamesService(userId);

    if (!delegations.length) {
        generateErrorUtil('Acceso denegado', 403);
    }

    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT t.city AS province
        FROM services s
        INNER JOIN typeOfServices t ON t.id = s.typeOfServicesId
        WHERE s.id = ?
        `,
        [serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    if (!delegations.includes(rows[0].province)) {
        generateErrorUtil('Acceso denegado', 403);
    }

    return true;
};

export default ensureServiceDelegationAccessService;
