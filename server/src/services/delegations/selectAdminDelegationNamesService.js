import getPool from '../../db/getPool.js';

const selectAdminDelegationNamesService = async (adminId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT d.name
        FROM delegations d
        INNER JOIN adminDelegations ad ON ad.delegationId = d.id
        WHERE ad.adminId = ?
        ORDER BY d.name ASC
        `,
        [adminId]
    );

    return rows.map((row) => row.name);
};

export default selectAdminDelegationNamesService;
