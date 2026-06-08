import getPool from '../../db/getPool.js';
import { allowedDocumentationFileFields } from '../../utils/employeeDocumentationFileUtil.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const clearEmployeeDocumentationDraftFileService = async (draftId, field) => {
    if (!allowedDocumentationFileFields.has(field)) {
        generateErrorUtil('Campo de archivo no permitido', 400);
    }

    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeDocumentationDrafts
            SET ${field} = NULL
            WHERE id = ?
        `,
        [draftId]
    );
};

export default clearEmployeeDocumentationDraftFileService;
