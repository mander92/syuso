import getPool from '../../db/getPool.js';

const selectDelegationsService = async (userId, role) => {
    const pool = await getPool();

    if (role === 'sudo') {
        const [rows] = await pool.query(
            `
            SELECT id, name
            FROM delegations
            ORDER BY name ASC
            `
        );
        return rows;
    }

    const [rows] = await pool.query(
        `
        SELECT d.id, d.name
        FROM delegations d
        INNER JOIN adminDelegations ad ON ad.delegationId = d.id
        WHERE ad.adminId = ?
        ORDER BY d.name ASC
        `,
        [userId]
    );

    return rows;
};

export default selectDelegationsService;
