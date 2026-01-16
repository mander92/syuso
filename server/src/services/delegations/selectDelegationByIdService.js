import getPool from '../../db/getPool.js';

const selectDelegationByIdService = async (delegationId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, name
        FROM delegations
        WHERE id = ?
        `,
        [delegationId]
    );

    return rows[0] || null;
};

export default selectDelegationByIdService;
