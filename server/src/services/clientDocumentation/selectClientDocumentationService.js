import getPool from '../../db/getPool.js';

const selectClientDocumentationService = async (clientId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT
                u.id AS clientId,
                u.firstName,
                u.lastName,
                u.email AS userEmail,
                u.phone AS userPhone,
                u.dni AS userTaxId,
                u.active,
                d.id,
                d.displayName,
                d.taxId,
                d.phone,
                d.email,
                d.contactPerson,
                d.acceptedBudgetPath,
                d.serviceContractPath,
                d.authorizations,
                d.paymentMethod,
                d.status,
                d.reviewNotes,
                d.createdAt,
                d.modifiedAt
            FROM users u
            LEFT JOIN clientDocumentations d ON d.clientId = u.id
            WHERE u.id = ? AND u.role = 'client'
        `,
        [clientId]
    );

    return rows[0] || null;
};

export default selectClientDocumentationService;
