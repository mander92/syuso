import getPool from '../../db/getPool.js';

const deleteUserService = async (userId) => {
    const pool = await getPool();

    await pool.query(
        `
        UPDATE users
        SET
            active = 0,
            email = CONCAT('deleted+', id, '@deleted.local'),
            dni = NULL,
            tip = NULL,
            deletedAt = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [userId]
    );
};

export default deleteUserService;
