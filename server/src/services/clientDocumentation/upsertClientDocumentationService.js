import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const upsertClientDocumentationService = async (clientId, data) => {
    const pool = await getPool();

    if (
        data.displayName !== undefined ||
        data.taxId !== undefined ||
        data.phone !== undefined ||
        data.email !== undefined ||
        data.active !== undefined
    ) {
        const displayName = String(data.displayName || '').trim();
        const firstName = displayName.slice(0, 25) || 'Cliente';
        const lastName = displayName.slice(25, 75).trim();
        const normalizedEmail = String(data.email || '').trim().toLowerCase();
        const normalizedTaxId = String(data.taxId || '').trim().toUpperCase();

        if (normalizedEmail) {
            const [emailRows] = await pool.query(
                `
                    SELECT id, role, deletedAt
                    FROM users
                    WHERE email = ? AND id <> ?
                    LIMIT 1
                `,
                [normalizedEmail, clientId]
            );
            const existingEmail = emailRows[0];
            if (existingEmail && !existingEmail.deletedAt) {
                generateErrorUtil(
                    existingEmail.role === 'client'
                        ? 'Ese email ya pertenece a otro cliente'
                        : 'Ese email ya pertenece a un trabajador o administrador',
                    409
                );
            }
        }

        if (normalizedTaxId) {
            const [taxRows] = await pool.query(
                `
                    SELECT id, role, deletedAt
                    FROM users
                    WHERE UPPER(REPLACE(dni, ' ', '')) = ?
                      AND id <> ?
                    LIMIT 1
                `,
                [normalizedTaxId.replace(/\s/g, ''), clientId]
            );
            const existingTaxId = taxRows[0];
            if (existingTaxId && !existingTaxId.deletedAt) {
                generateErrorUtil(
                    existingTaxId.role === 'client'
                        ? 'Ese CIF/DNI/NIE ya pertenece a otro cliente'
                        : 'Ese CIF/DNI/NIE ya pertenece a un trabajador o administrador',
                    409
                );
            }
        }

        const emailUpdate = normalizedEmail ? ', email = ?' : '';
        const activeUpdate = data.active !== undefined ? ', active = ?' : '';
        await pool.query(
            `
                UPDATE users
                SET firstName = ?, lastName = ?, dni = ?, phone = ?${emailUpdate}${activeUpdate}
                WHERE id = ? AND role = 'client'
            `,
            [
                firstName,
                lastName,
                normalizedTaxId || null,
                data.phone || null,
                ...(normalizedEmail ? [normalizedEmail] : []),
                ...(data.active !== undefined ? [data.active ? 1 : 0] : []),
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
