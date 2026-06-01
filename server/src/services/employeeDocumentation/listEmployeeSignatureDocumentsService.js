import getPool from '../../db/getPool.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const listEmployeeSignatureDocumentsService = async ({
    viewerId,
    viewerRole,
    employeeId,
}) => {
    const pool = await getPool();
    const isAdmin = viewerRole === 'admin' || viewerRole === 'sudo';
    const targetEmployeeId = isAdmin ? employeeId : viewerId;

    const values = [];
    let delegationFilter = '';

    if (viewerRole === 'admin') {
        const delegations = await selectAdminDelegationNamesService(viewerId);
        if (!delegations.length) return [];
        delegationFilter = ` AND u.city IN (${delegations
            .map(() => '?')
            .join(', ')})`;
        values.push(...delegations);
    }

    let sql = `
        SELECT
            d.id,
            d.employeeId,
            u.firstName,
            u.lastName,
            u.email,
            d.title,
            d.documentType,
            d.originalFilePath,
            d.originalFileName,
            d.signaturePath,
            d.signedFileName,
            d.dueDate,
            d.periodMonth,
            d.status,
            d.signedAt,
            d.validatedAt,
            d.createdAt,
            d.modifiedAt
        FROM employeeSignatureDocuments d
        INNER JOIN users u ON u.id = d.employeeId
        WHERE d.deletedAt IS NULL
        ${delegationFilter}
    `;

    if (targetEmployeeId) {
        sql += ' AND d.employeeId = ?';
        values.push(targetEmployeeId);
    }

    sql += ' ORDER BY d.status ASC, d.createdAt DESC';

    const [rows] = await pool.query(sql, values);
    return rows;
};

export default listEmployeeSignatureDocumentsService;
