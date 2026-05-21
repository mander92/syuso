import getPool from '../../db/getPool.js';

const selectEmployeeDocumentationDraftService = async (draftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT *
            FROM employeeDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );

    return rows[0] || null;
};

export default selectEmployeeDocumentationDraftService;

