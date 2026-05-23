import getPool from '../../db/getPool.js';

const reopenEmployeeSignatureDocumentService = async (documentId) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeSignatureDocuments
            SET
                signaturePath = NULL,
                signedFileName = NULL,
                status = 'pending',
                signedAt = NULL,
                validatedAt = NULL,
                validatedBy = NULL
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [documentId]
    );
};

export default reopenEmployeeSignatureDocumentService;
