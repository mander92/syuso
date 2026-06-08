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
        SELECT s.province, a.city
        FROM services s
        LEFT JOIN addresses a ON a.id = s.addressId
        WHERE s.id = ?
        `,
        [serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    const normalizedDelegations = delegations.map((name) =>
        name.trim().toLowerCase()
    );
    const serviceDelegations = [rows[0].province, rows[0].city]
        .map((name) => (name || '').trim().toLowerCase())
        .filter(Boolean);

    const hasAccess = serviceDelegations.some((name) =>
        normalizedDelegations.includes(name)
    );

    if (!hasAccess) {
        generateErrorUtil('Acceso denegado', 403);
    }

    return true;
};

export default ensureServiceDelegationAccessService;
