import getPool from '../../db/getPool.js';

const selectClientDocumentationDraftService = async (draftId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT *
            FROM clientDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );

    return rows[0] || null;
};

export default selectClientDocumentationDraftService;
