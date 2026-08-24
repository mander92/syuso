import getPool from '../../db/getPool.js';

const ensureBillingEmailSettingsTable = async (pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS billingEmailSettings (
            id TINYINT PRIMARY KEY NOT NULL,
            emails TEXT,
            ccEmails TEXT,
            modifiedBy CHAR(36),
            modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

const selectBillingEmailSettingsService = async () => {
    const pool = await getPool();
    await ensureBillingEmailSettingsTable(pool);

    const [rows] = await pool.query(
        `
        SELECT emails, ccEmails
        FROM billingEmailSettings
        WHERE id = 1
        `
    );

    return {
        emails: rows[0]?.emails || '',
        ccEmails: rows[0]?.ccEmails || '',
    };
};

export default selectBillingEmailSettingsService;
export { ensureBillingEmailSettingsTable };
