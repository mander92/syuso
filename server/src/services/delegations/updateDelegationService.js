import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateDelegationService = async (delegationId, name) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, name
        FROM delegations
        WHERE id = ?
        `,
        [delegationId]
    );

    if (!rows.length) {
        generateErrorUtil('Delegacion no encontrada', 404);
    }

    const currentName = rows[0].name;
    const nextName = name.trim();

    const [duplicated] = await pool.query(
        `
        SELECT id
        FROM delegations
        WHERE name = ? AND id <> ?
        `,
        [nextName, delegationId]
    );

    if (duplicated.length) {
        generateErrorUtil('La delegacion ya existe', 409);
    }

    await pool.query(
        `
        UPDATE delegations
        SET name = ?
        WHERE id = ?
        `,
        [nextName, delegationId]
    );

    if (currentName !== nextName) {
        await pool.query(
            `
            UPDATE typeOfServices
            SET city = ?
            WHERE city = ?
            `,
            [nextName, currentName]
        );
    }

    return { id: delegationId, name: nextName };
};

export default updateDelegationService;
