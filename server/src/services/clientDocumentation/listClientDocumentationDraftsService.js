import getPool from '../../db/getPool.js';

const listClientDocumentationDraftsService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT *
            FROM clientDocumentationDrafts
            ORDER BY createdAt DESC
        `
    );

    return rows;
};

export default listClientDocumentationDraftsService;
