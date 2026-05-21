import getPool from '../../db/getPool.js';

const markClientDocumentationDraftTokenUsedService = async (token) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE clientDocumentationDraftTokens
            SET usedAt = CURRENT_TIMESTAMP
            WHERE token = ?
        `,
        [token]
    );
};

export default markClientDocumentationDraftTokenUsedService;
