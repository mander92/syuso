import getPool from '../../db/getPool.js';

const selectEmployeeDocumentationEmailSettingsService = async () => {
    const pool = await getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS employeeDocumentationEmailSettings (
            id TINYINT PRIMARY KEY NOT NULL,
            emails TEXT,
            ccEmails TEXT,
            modifiedBy CHAR(36),
            modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    const [rows] = await pool.query(
        `
        SELECT emails, ccEmails
        FROM employeeDocumentationEmailSettings
        WHERE id = 1
        `
    );

    return {
        emails: rows[0]?.emails || '',
        ccEmails: rows[0]?.ccEmails || '',
    };
};

export default selectEmployeeDocumentationEmailSettingsService;
