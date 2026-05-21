import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const fields = [
    'displayName',
    'taxId',
    'phone',
    'email',
    'contactPerson',
    'acceptedBudgetPath',
    'serviceContractPath',
    'authorizations',
    'paymentMethod',
    'status',
    'reviewNotes',
    'linkedClientId',
];

const upsertClientDocumentationDraftService = async (draftId, data) => {
    const pool = await getPool();
    const id = draftId || uuid();

    const [existing] = await pool.query(
        'SELECT id FROM clientDocumentationDrafts WHERE id = ?',
        [id]
    );

    const payload = {};
    fields.forEach((field) => {
        if (data[field] !== undefined) payload[field] = data[field] || null;
    });

    if (existing.length) {
        const updates = Object.keys(payload);
        if (!updates.length) return id;

        await pool.query(
            `
                UPDATE clientDocumentationDrafts
                SET ${updates.map((field) => `${field} = ?`).join(', ')}
                WHERE id = ?
            `,
            [...updates.map((field) => payload[field]), id]
        );
        return id;
    }

    await pool.query(
        `
            INSERT INTO clientDocumentationDrafts
                (id, displayName, taxId, phone, email, contactPerson,
                 acceptedBudgetPath, serviceContractPath, authorizations,
                 paymentMethod, status, reviewNotes, linkedClientId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            payload.displayName || null,
            payload.taxId || null,
            payload.phone || null,
            payload.email || null,
            payload.contactPerson || null,
            payload.acceptedBudgetPath || null,
            payload.serviceContractPath || null,
            payload.authorizations || null,
            payload.paymentMethod || null,
            payload.status || 'draft',
            payload.reviewNotes || null,
            payload.linkedClientId || null,
        ]
    );

    return id;
};

export default upsertClientDocumentationDraftService;
