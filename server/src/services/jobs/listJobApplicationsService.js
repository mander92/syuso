import getPool from '../../db/getPool.js';

const listJobApplicationsService = async (search, startDate, endDate) => {
    const pool = await getPool();

    let sql = `
        SELECT id, fullName, email, phone, message, cvFile, createdAt
        FROM job_applications
        WHERE 1=1
    `;
    const values = [];

    if (search) {
        sql +=
            ' AND (fullName LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const like = `%${search}%`;
        values.push(like, like, like);
    }

    if (startDate && endDate) {
        sql += ' AND createdAt BETWEEN ? AND ?';
        values.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    sql += ' ORDER BY createdAt DESC';

    const [rows] = await pool.query(sql, values);
    return rows;
};

export default listJobApplicationsService;
