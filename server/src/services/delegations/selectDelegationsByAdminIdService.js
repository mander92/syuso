import getPool from '../../db/getPool.js';

const selectDelegationsByAdminIdService = async (adminId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT d.id, d.name
        FROM delegations d
        INNER JOIN adminDelegations ad ON ad.delegationId = d.id
        WHERE ad.adminId = ?
        ORDER BY d.name ASC
        `,
        [adminId]
    );

    return rows;
};

export default selectDelegationsByAdminIdService;
