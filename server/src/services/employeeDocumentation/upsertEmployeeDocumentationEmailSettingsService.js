import getPool from '../../db/getPool.js';

const upsertEmployeeDocumentationEmailSettingsService = async ({
    emails,
    ccEmails,
    modifiedBy,
}) => {
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

    await pool.query(
        `
        INSERT INTO employeeDocumentationEmailSettings
            (id, emails, ccEmails, modifiedBy)
        VALUES (1, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            emails = VALUES(emails),
            ccEmails = VALUES(ccEmails),
            modifiedBy = VALUES(modifiedBy)
        `,
        [emails || '', ccEmails || '', modifiedBy || null]
    );

    return {
        emails: emails || '',
        ccEmails: ccEmails || '',
    };
};

export default upsertEmployeeDocumentationEmailSettingsService;
