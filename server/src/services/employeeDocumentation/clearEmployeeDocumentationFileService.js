import getPool from '../../db/getPool.js';
import { allowedDocumentationFileFields } from '../../utils/employeeDocumentationFileUtil.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const clearEmployeeDocumentationFileService = async (userId, field) => {
    if (!allowedDocumentationFileFields.has(field)) {
        generateErrorUtil('Campo de archivo no permitido', 400);
    }

    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeDocumentations
            SET ${field} = NULL
            WHERE userId = ?
        `,
        [userId]
    );
};

export default clearEmployeeDocumentationFileService;
