import getPool from '../../db/getPool.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const listEmployeeDocumentationsService = async ({ viewerId, viewerRole } = {}) => {
    const pool = await getPool();
    const values = [];
    let delegationFilter = '';

    if (viewerRole === 'admin') {
        const delegations = await selectAdminDelegationNamesService(viewerId);
        if (!delegations.length) return [];
        delegationFilter = ` AND u.city IN (${delegations.map(() => '?').join(', ')})`;
        values.push(...delegations);
    }

    const [rows] = await pool.query(
        `
            SELECT
                u.id AS userId,
                u.firstName,
                u.lastName,
                u.email,
                u.phone AS userPhone,
                u.dni,
                u.tip,
                u.city,
                u.active,
                d.id,
                d.birthDate,
                d.bankAccount,
                d.dniFrontPath,
                d.dniBackPath,
                d.tipFrontPath,
                d.tipBackPath,
                d.address,
                d.phone,
                d.socialSecurityNumber,
                d.status,
                d.reviewNotes,
                d.modifiedAt
            FROM users u
            LEFT JOIN employeeDocumentations d ON d.userId = u.id
            WHERE u.role = 'employee' AND u.deletedAt IS NULL
            ${delegationFilter}
            ORDER BY u.firstName, u.lastName
        `,
        values
    );

    return rows;
};

export default listEmployeeDocumentationsService;
