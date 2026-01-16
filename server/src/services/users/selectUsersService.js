import getPool from '../../db/getPool.js';

const selectUsersService = async (
    job,
    active,
    city,
    role,
    delegationNames = []
) => {
    const pool = await getPool();

    let sqlQuery = `
        SELECT 
            u.id AS id,
            u.role,
            u.avatar,
            u.email,
            u.firstName,
            u.lastName,
            u.phone,
            u.city,
            u.job,
            u.dni,
            u.active,
            u.deletedAt,
            GROUP_CONCAT(d.name ORDER BY d.name SEPARATOR ', ') AS delegations
        FROM users u
        LEFT JOIN adminDelegations ad ON ad.adminId = u.id
        LEFT JOIN delegations d ON d.id = ad.delegationId
        WHERE 1=1
    `;

    let sqlValues = [];

    if (job) {
        sqlQuery += ' AND u.job = ?';
        sqlValues.push(job);
    }

    if (city) {
        sqlQuery += ' AND u.city = ?';
        sqlValues.push(city);
    }

    if (active) {
        sqlQuery += ' AND u.active = ?';
        sqlValues.push(active);
    }

    if (role) {
        sqlQuery += ' AND u.role = ?';
        sqlValues.push(role);
    }

    if (delegationNames.length) {
        sqlQuery += ` AND u.city IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        sqlValues.push(...delegationNames);
    }

    sqlQuery += ' GROUP BY u.id ORDER BY u.createdAt DESC';

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};

export default selectUsersService;

