import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const fields = [
    'firstName',
    'lastName',
    'email',
    'dni',
    'birthDate',
    'bankAccount',
    'dniFrontPath',
    'dniBackPath',
    'tipFrontPath',
    'tipBackPath',
    'address',
    'phone',
    'socialSecurityNumber',
    'status',
    'reviewNotes',
    'linkedUserId',
];

const upsertEmployeeDocumentationDraftService = async (draftId, data) => {
    const pool = await getPool();
    const id = draftId || uuid();

    const [existing] = await pool.query(
        'SELECT id FROM employeeDocumentationDrafts WHERE id = ?',
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
                UPDATE employeeDocumentationDrafts
                SET ${updates.map((field) => `${field} = ?`).join(', ')}
                WHERE id = ?
            `,
            [...updates.map((field) => payload[field]), id]
        );
        return id;
    }

    await pool.query(
        `
            INSERT INTO employeeDocumentationDrafts
                (id, firstName, lastName, email, dni, birthDate, bankAccount,
                 dniFrontPath, dniBackPath, tipFrontPath, tipBackPath, address,
                 phone, socialSecurityNumber, status, reviewNotes, linkedUserId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            payload.firstName || null,
            payload.lastName || null,
            payload.email || null,
            payload.dni || null,
            payload.birthDate || null,
            payload.bankAccount || null,
            payload.dniFrontPath || null,
            payload.dniBackPath || null,
            payload.tipFrontPath || null,
            payload.tipBackPath || null,
            payload.address || null,
            payload.phone || null,
            payload.socialSecurityNumber || null,
            payload.status || 'draft',
            payload.reviewNotes || null,
            payload.linkedUserId || null,
        ]
    );

    return id;
};

export default upsertEmployeeDocumentationDraftService;

