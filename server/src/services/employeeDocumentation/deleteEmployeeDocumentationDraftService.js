import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteEmployeeDocumentationDraftService = async (draftId) => {
    const pool = await getPool();

    const [draftRows] = await pool.query(
        `
            SELECT id, linkedUserId
            FROM employeeDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );

    const draft = draftRows[0];
    if (!draft) {
        generateErrorUtil('Alta de trabajador no encontrada', 404);
    }

    await pool.query(
        `
            DELETE FROM employeeDocumentationDraftTokens
            WHERE draftId = ?
        `,
        [draftId]
    );

    await pool.query(
        `
            DELETE FROM employeeDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );
};

export default deleteEmployeeDocumentationDraftService;
