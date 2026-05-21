import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const upsertEmployeeDocumentationService = async (userId, data) => {
    const pool = await getPool();

    const [existing] = await pool.query(
        'SELECT id FROM employeeDocumentations WHERE userId = ?',
        [userId]
    );

    const fields = [
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
                UPDATE employeeDocumentations
                SET ${updates.map((field) => `${field} = ?`).join(', ')}
                WHERE userId = ?
            `,
            [...updates.map((field) => payload[field]), userId]
        );
        return existing[0].id;
    }

    const id = uuid();
    await pool.query(
        `
            INSERT INTO employeeDocumentations
                (id, userId, birthDate, bankAccount, dniFrontPath, dniBackPath,
                 tipFrontPath, tipBackPath, address, phone, socialSecurityNumber,
                 status, reviewNotes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            userId,
            payload.birthDate || null,
            payload.bankAccount || null,
            payload.dniFrontPath || null,
            payload.dniBackPath || null,
            payload.tipFrontPath || null,
            payload.tipBackPath || null,
            payload.address || null,
            payload.phone || null,
            payload.socialSecurityNumber || null,
            payload.status || 'pending',
            payload.reviewNotes || null,
        ]
    );

    return id;
};

export default upsertEmployeeDocumentationService;

