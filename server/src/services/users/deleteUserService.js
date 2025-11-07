import getPool from '../../db/getPool.js';

const deleteUserService = async (userId) => {
    const pool = await getPool();


    await pool.query(
        `
        UPDATE users SET active = 0, deletedAt = CURRENT_TIMESTAMP WHERE id = ?
        `,
        [userId]
    );
};

export default deleteUserService;
