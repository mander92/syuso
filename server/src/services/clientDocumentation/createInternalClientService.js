import bcrypt from 'bcrypt';
import randomstring from 'randomstring';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const splitDisplayName = (displayName) => {
    const normalized = String(displayName || '').trim();
    if (!normalized) return { firstName: 'Cliente', lastName: 'Interno' };
    if (normalized.length <= 25) return { firstName: normalized, lastName: '' };
    return {
        firstName: normalized.slice(0, 25),
        lastName: normalized.slice(25, 75).trim(),
    };
};

const createInternalClientService = async ({
    displayName,
    taxId,
    phone,
    email,
    active = true,
}) => {
    const pool = await getPool();

    const normalizedTaxId = String(taxId || '').trim().toUpperCase();
    if (!normalizedTaxId) {
        generateErrorUtil('El CIF/DNI/NIE es obligatorio para crear un cliente', 400);
    }

    const realEmail = String(email || '').trim().toLowerCase();
    const normalizedEmail = realEmail || `client+${uuid()}@internal.local`;

    const [existingEmailRows] = realEmail
        ? await pool.query('SELECT id, role, deletedAt FROM users WHERE email = ?', [
              realEmail,
          ])
        : [[]];

    const existingEmail = existingEmailRows[0] || null;
    if (
        existingEmail &&
        !existingEmail.deletedAt &&
        existingEmail.role !== 'client'
    ) {
        generateErrorUtil(
            'Ese email ya pertenece a un trabajador o administrador',
            409
        );
    }

    const [existingTaxIdRows] = await pool.query(
        `
            SELECT id, role, deletedAt
            FROM users
            WHERE UPPER(REPLACE(dni, ' ', '')) = ?
            LIMIT 1
        `,
        [normalizedTaxId.replace(/\s/g, '')]
    );
    const existingTaxId = existingTaxIdRows[0] || null;

    if (
        existingTaxId &&
        !existingTaxId.deletedAt &&
        existingTaxId.role !== 'client'
    ) {
        generateErrorUtil(
            'Ese CIF/DNI/NIE ya pertenece a un trabajador o administrador',
            409
        );
    }

    if (
        existingEmail?.role === 'client' &&
        existingTaxId?.role === 'client' &&
        existingEmail.id !== existingTaxId.id
    ) {
        generateErrorUtil(
            'El email y el CIF/DNI/NIE pertenecen a clientes distintos',
            409
        );
    }

    const { firstName, lastName } = splitDisplayName(displayName);
    const reusableClient =
        existingEmail?.role === 'client'
            ? existingEmail
            : existingTaxId?.role === 'client'
              ? existingTaxId
              : null;
    const userId = reusableClient?.id || uuid();

    if (reusableClient) {
        const password = reusableClient.deletedAt
            ? await bcrypt.hash(randomstring.generate(24), 10)
            : null;
        await pool.query(
            `
                UPDATE users
                SET firstName = ?,
                    lastName = ?,
                    dni = ?,
                    phone = ?,
                    email = ?,
                    ${password ? 'password = ?,' : ''}
                    role = 'client',
                    active = ?,
                    deletedAt = NULL
                WHERE id = ?
            `,
            [
                firstName,
                lastName,
                normalizedTaxId,
                phone || null,
                normalizedEmail,
                ...(password ? [password] : []),
                active ? 1 : 0,
                userId,
            ]
        );
    } else {
        const password = await bcrypt.hash(randomstring.generate(24), 10);
        await pool.query(
            `
                INSERT INTO users
                    (id, email, password, firstName, lastName, dni, phone, role, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'client', ?)
            `,
            [
                userId,
                normalizedEmail,
                password,
                firstName,
                lastName,
                normalizedTaxId,
                phone || null,
                active ? 1 : 0,
            ]
        );
    }

    return userId;
};

export default createInternalClientService;
