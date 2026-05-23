import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const ensureEmployeeDocumentationAccessService = async ({
    viewerId,
    viewerRole,
    employeeId,
}) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT id, role, city
            FROM users
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [employeeId]
    );

    const employee = rows[0];
    if (!employee) generateErrorUtil('Usuario no encontrado', 404);

    if (viewerRole === 'sudo' || viewerId === employeeId) {
        return employee;
    }

    if (viewerRole !== 'admin') {
        generateErrorUtil('Acceso denegado', 403);
    }

    const allowedDelegations = await selectAdminDelegationNamesService(viewerId);
    if (!allowedDelegations.length || !allowedDelegations.includes(employee.city)) {
        generateErrorUtil('Acceso denegado: trabajador fuera de tu delegacion', 403);
    }

    return employee;
};

export default ensureEmployeeDocumentationAccessService;
