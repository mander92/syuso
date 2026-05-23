import getPool from '../../db/getPool.js';

const deleteEmployeeSignatureDocumentService = async (documentId) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeSignatureDocuments
            SET deletedAt = CURRENT_TIMESTAMP
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [documentId]
    );
};

export default deleteEmployeeSignatureDocumentService;
