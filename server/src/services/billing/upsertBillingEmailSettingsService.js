import getPool from '../../db/getPool.js';
import { ensureBillingEmailSettingsTable } from './selectBillingEmailSettingsService.js';

const upsertBillingEmailSettingsService = async ({
    emails,
    ccEmails,
    modifiedBy,
}) => {
    const pool = await getPool();
    await ensureBillingEmailSettingsTable(pool);

    await pool.query(
        `
        INSERT INTO billingEmailSettings
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

export default upsertBillingEmailSettingsService;
