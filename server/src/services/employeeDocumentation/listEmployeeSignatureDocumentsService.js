import getPool from '../../db/getPool.js';

const listEmployeeSignatureDocumentsService = async ({
    viewerId,
    viewerRole,
    employeeId,
}) => {
    const pool = await getPool();
    const isAdmin = viewerRole === 'admin' || viewerRole === 'sudo';
    const targetEmployeeId = isAdmin ? employeeId : viewerId;

    const values = [];
    let sql = `
        SELECT
            d.id,
            d.employeeId,
            u.firstName,
            u.lastName,
            u.email,
            d.title,
            d.documentType,
            d.originalFileName,
            d.dueDate,
            d.periodMonth,
            d.status,
            d.signedAt,
            d.createdAt,
            d.modifiedAt
        FROM employeeSignatureDocuments d
        INNER JOIN users u ON u.id = d.employeeId
        WHERE d.deletedAt IS NULL
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
