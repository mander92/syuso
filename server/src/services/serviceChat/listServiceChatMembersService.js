import getPool from '../../db/getPool.js';

const listServiceChatMembersService = async (serviceId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT DISTINCT member.id, member.firstName, member.lastName, member.role
        FROM (
            SELECT u.id, u.firstName, u.lastName, u.role
            FROM personsAssigned pa
            INNER JOIN users u ON u.id = pa.employeeId
            WHERE pa.serviceId = ? AND u.deletedAt IS NULL

            UNION

            SELECT u.id, u.firstName, u.lastName, u.role
            FROM shiftRecords sr
            INNER JOIN users u ON u.id = sr.employeeId
            WHERE sr.serviceId = ? AND u.deletedAt IS NULL

            UNION

            SELECT u.id, u.firstName, u.lastName, u.role
            FROM services s
            INNER JOIN typeOfServices t ON t.id = s.typeOfServicesId
            INNER JOIN delegations d ON d.name = t.city
            INNER JOIN adminDelegations ad ON ad.delegationId = d.id
            INNER JOIN users u ON u.id = ad.adminId
            WHERE s.id = ? AND u.role = 'admin' AND u.deletedAt IS NULL

            UNION

            SELECT u.id, u.firstName, u.lastName, u.role
            FROM users u
            WHERE u.role = 'sudo' AND u.deletedAt IS NULL
        ) AS member
        ORDER BY member.role, member.firstName, member.lastName
        `,
        [serviceId, serviceId, serviceId]
    );

    return rows;
};

export default listServiceChatMembersService;
