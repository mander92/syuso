import getPool from '../../db/getPool.js';

const selectDocumentationDraftByTokenService = async (token) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT
                t.token,
                t.expiresAt,
                t.usedAt,
                d.*
            FROM employeeDocumentationDraftTokens t
            INNER JOIN employeeDocumentationDrafts d ON d.id = t.draftId
            WHERE t.token = ?
              AND t.expiresAt > NOW()
        `,
        [token]
    );

    return rows[0] || null;
};

export default selectDocumentationDraftByTokenService;

