import getPool from '../../db/getPool.js';

const selectEmployeeDocumentationService = async (userId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT
                u.id AS userId,
                u.role,
                u.firstName,
                u.lastName,
                u.email,
                u.phone AS userPhone,
                u.dni,
                u.tip,
                u.active,
                u.terminationDate,
                u.terminationReason,
                d.id,
                d.birthDate,
                d.bankAccount,
                d.dniFrontPath,
                d.dniBackPath,
                d.tipFrontPath,
                d.tipBackPath,
                d.address,
                d.phone,
                d.socialSecurityNumber,
                d.poloSize,
                d.pantsSize,
                d.status,
                d.reviewNotes,
                d.createdAt,
                d.modifiedAt
            FROM users u
            LEFT JOIN employeeDocumentations d ON d.userId = u.id
            WHERE u.id = ?
              AND u.deletedAt IS NULL
        `,
        [userId]
    );

    return rows[0] || null;
};

export default selectEmployeeDocumentationService;
