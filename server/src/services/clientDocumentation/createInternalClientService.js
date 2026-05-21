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
}) => {
    const pool = await getPool();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
        generateErrorUtil('El email del cliente es obligatorio', 400);
    }

    const [existing] = await pool.query(
        'SELECT id, deletedAt FROM users WHERE email = ?',
        [normalizedEmail]
    );

    if (existing.length && !existing[0].deletedAt) {
        generateErrorUtil('Ya existe un usuario con ese email', 409);
    }

    const { firstName, lastName } = splitDisplayName(displayName);
    const password = await bcrypt.hash(randomstring.generate(24), 10);
    const userId = existing[0]?.id || uuid();

    if (existing[0]?.deletedAt) {
        await pool.query(
            `
                UPDATE users
                SET firstName = ?, lastName = ?, dni = ?, phone = ?,
                    email = ?, password = ?, role = 'client',
                    active = 0, deletedAt = NULL
                WHERE id = ?
            `,
            [
                firstName,
                lastName,
                taxId || null,
                phone || null,
                normalizedEmail,
                password,
                userId,
            ]
        );
    } else {
        await pool.query(
            `
                INSERT INTO users
                    (id, email, password, firstName, lastName, dni, phone, role, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'client', 0)
            `,
            [
                userId,
                normalizedEmail,
                password,
                firstName,
                lastName,
                taxId || null,
                phone || null,
            ]
        );
    }

    return userId;
};

export default createInternalClientService;
