import getPool from '../../db/getPool.js';

const listEmployeeDocumentationDraftsService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT *
            FROM employeeDocumentationDrafts
            ORDER BY createdAt DESC
        `
    );

    return rows;
};

export default listEmployeeDocumentationDraftsService;

