import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const createEmployeeSignatureDocumentService = async ({
    employeeId,
    title,
    documentType,
    originalFilePath,
    originalFileName,
    createdBy,
}) => {
    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
            INSERT INTO employeeSignatureDocuments
                (id, employeeId, title, documentType, originalFilePath, originalFileName, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            employeeId,
            title,
            documentType || 'other',
            originalFilePath,
            originalFileName || null,
            createdBy,
        ]
    );

    const [rows] = await pool.query(
        `
            SELECT d.*, u.firstName, u.lastName, u.email
            FROM employeeSignatureDocuments d
            INNER JOIN users u ON u.id = d.employeeId
            WHERE d.id = ?
        `,
        [id]
    );

    return rows[0];
};

export default createEmployeeSignatureDocumentService;
