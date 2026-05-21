import crypto from 'crypto';

import getPool from '../../db/getPool.js';

const createDocumentationDraftTokenService = async (draftId, expiresAt) => {
    const pool = await getPool();
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
        `
            INSERT INTO employeeDocumentationDraftTokens
                (token, draftId, expiresAt)
            VALUES (?, ?, ?)
        `,
        [token, draftId, expiresAt]
    );

    return token;
};

export default createDocumentationDraftTokenService;

