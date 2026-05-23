import getPool from '../../db/getPool.js';

const signEmployeeSignatureDocumentService = async (
    documentId,
    signaturePath,
    signedFileName = null
) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeSignatureDocuments
            SET
                signaturePath = ?,
                signedFileName = ?,
                status = 'submitted',
                signedAt = CURRENT_TIMESTAMP,
                validatedAt = NULL,
                validatedBy = NULL
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [signaturePath, signedFileName, documentId]
    );
};

export default signEmployeeSignatureDocumentService;
