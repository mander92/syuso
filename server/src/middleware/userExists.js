import getPool from '../db/getPool.js';
import generateErrorUtil from '../utils/generateErrorUtil.js';

const userExists = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            generateErrorUtil('Falta el parámetro userId', 400);
        }

        const pool = await getPool();

        // ❌ NO filtramos por active aquí
        const [users] = await pool.query(
            `
                SELECT 
                    id,
                    email,
                    firstName,
                    lastName,
                    dni,
                    phone,
                    city,
                    job,
                    role,
                    avatar,
                    active
                FROM users
                WHERE id = ?
            `,
            [userId]
        );

        if (users.length === 0) {
            generateErrorUtil('Usuario no encontrado', 404);
        }

        // Guardamos el usuario en la request por si hace falta después
        req.user = users[0];

        next();
    } catch (error) {
        next(error);
    }
};

export default userExists;