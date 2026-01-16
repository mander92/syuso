import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const insertDelegationService = async (name) => {
    const pool = await getPool();

    const normalizedName = name.trim();

    const [existing] = await pool.query(
        `
        SELECT id FROM delegations WHERE name = ?
        `,
        [normalizedName]
    );

    if (existing.length) {
        generateErrorUtil('La delegacion ya existe', 409);
    }

    const id = uuid();

    await pool.query(
        `
        INSERT INTO delegations (id, name)
        VALUES (?, ?)
        `,
        [id, normalizedName]
    );

    return { id, name: normalizedName };
};

export default insertDelegationService;
