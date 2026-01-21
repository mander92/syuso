import bcrypt from 'bcrypt';
import getPool from '../../db/getPool.js';

const updateAdminUserPasswordService = async (userId, newPassword) => {
    const pool = await getPool();
    const hashPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
        `
        UPDATE users
        SET password = ?, recoverPasswordCode = NULL
        WHERE id = ?
        `,
        [hashPassword, userId]
    );
};

export default updateAdminUserPasswordService;
