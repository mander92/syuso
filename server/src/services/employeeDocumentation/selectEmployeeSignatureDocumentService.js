import getPool from '../../db/getPool.js';

const selectEmployeeSignatureDocumentService = async (documentId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT d.*, u.firstName, u.lastName, u.email
            FROM employeeSignatureDocuments d
            INNER JOIN users u ON u.id = d.employeeId
            WHERE d.id = ?
              AND d.deletedAt IS NULL
        `,
        [documentId]
    );

    return rows[0] || null;
};

export default selectEmployeeSignatureDocumentService;
