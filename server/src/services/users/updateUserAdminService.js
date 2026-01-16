// services/users/updateUserAdminService.js
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateUserAdminService = async (userId, data) => {
    const pool = await getPool();

    // Campos que se pueden actualizar desde admin
    const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'dni',
        'city',
        'job',
        'role',
        'active',
        'deletedAt',
    ];

    const fields = [];
    const values = [];

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    }

    if (fields.length === 0) {
        generateErrorUtil(
            'No se han proporcionado campos válidos para actualizar',
            400
        );
    }

    values.push(userId);

    const query = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
    `;

    await pool.query(query, values);
};

export default updateUserAdminService;

