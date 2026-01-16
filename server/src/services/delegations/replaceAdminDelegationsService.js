import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';

const replaceAdminDelegationsService = async (adminId, delegationIds) => {
    const pool = await getPool();

    await pool.query(
        `
        DELETE FROM adminDelegations
        WHERE adminId = ?
        `,
        [adminId]
    );

    if (!delegationIds.length) return;

    const values = delegationIds.map((delegationId) => [
        uuid(),
        adminId,
        delegationId,
    ]);

    await pool.query(
        `
        INSERT INTO adminDelegations (id, adminId, delegationId)
        VALUES ?
        `,
        [values]
    );
};

export default replaceAdminDelegationsService;
