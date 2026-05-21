import getPool from '../../db/getPool.js';

const markDocumentationDraftTokenUsedService = async (token) => {
    const pool = await getPool();

    await pool.query(
        `
            UPDATE employeeDocumentationDraftTokens
            SET usedAt = NOW()
            WHERE token = ?
        `,
        [token]
    );
};

export default markDocumentationDraftTokenUsedService;

