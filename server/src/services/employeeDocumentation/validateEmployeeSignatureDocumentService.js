import getPool from '../../db/getPool.js';

const validateEmployeeSignatureDocumentService = async (documentId, validatedBy) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeSignatureDocuments
            SET
                status = 'validated',
                validatedAt = CURRENT_TIMESTAMP,
                validatedBy = ?
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [validatedBy, documentId]
    );
};

export default validateEmployeeSignatureDocumentService;
