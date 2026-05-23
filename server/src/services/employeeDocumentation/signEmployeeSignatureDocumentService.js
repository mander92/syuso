import getPool from '../../db/getPool.js';

const signEmployeeSignatureDocumentService = async (documentId, signaturePath) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeSignatureDocuments
            SET
                signaturePath = ?,
                status = 'signed',
                signedAt = CURRENT_TIMESTAMP
            WHERE id = ?
              AND deletedAt IS NULL
        `,
        [signaturePath, documentId]
    );
};

export default signEmployeeSignatureDocumentService;
