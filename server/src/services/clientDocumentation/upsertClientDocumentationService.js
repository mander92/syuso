import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const upsertClientDocumentationService = async (clientId, data) => {
    const pool = await getPool();

    if (
        data.displayName !== undefined ||
        data.taxId !== undefined ||
        data.phone !== undefined ||
        data.email !== undefined
    ) {
        const displayName = String(data.displayName || '').trim();
        const firstName = displayName.slice(0, 25) || 'Cliente';
        const lastName = displayName.slice(25, 75).trim();
        await pool.query(
            `
                UPDATE users
                SET firstName = ?, lastName = ?, dni = ?, phone = ?, email = ?
                WHERE id = ? AND role = 'client'
            `,
            [
                firstName,
                lastName,
                data.taxId || null,
                data.phone || null,
                data.email,
                clientId,
            ]
        );
    }

    const [existing] = await pool.query(
        'SELECT id FROM clientDocumentations WHERE clientId = ?',
        [clientId]
    );

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
    ];

    const payload = {};
    fields.forEach((field) => {
        if (data[field] !== undefined) payload[field] = data[field] || null;
    });

    if (existing.length) {
        const updates = Object.keys(payload);
        if (!updates.length) return existing[0].id;

        await pool.query(
            `
                UPDATE clientDocumentations
                SET ${updates.map((field) => `${field} = ?`).join(', ')}
                WHERE clientId = ?
            `,
            [...updates.map((field) => payload[field]), clientId]
        );
        return existing[0].id;
    }

    const id = uuid();
    await pool.query(
        `
            INSERT INTO clientDocumentations
                (id, clientId, displayName, taxId, phone, email, contactPerson,
                 acceptedBudgetPath, serviceContractPath, authorizations,
                 paymentMethod, status, reviewNotes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            clientId,
            payload.displayName || null,
            payload.taxId || null,
            payload.phone || null,
            payload.email || null,
            payload.contactPerson || null,
            payload.acceptedBudgetPath || null,
            payload.serviceContractPath || null,
            payload.authorizations || null,
            payload.paymentMethod || null,
            payload.status || 'pending',
            payload.reviewNotes || null,
        ]
    );

    return id;
};

export default upsertClientDocumentationService;
