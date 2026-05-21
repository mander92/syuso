import getPool from '../../db/getPool.js';

const listEmployeeDocumentationsService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
            SELECT
                u.id AS userId,
                u.firstName,
                u.lastName,
                u.email,
                u.phone AS userPhone,
                u.city,
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
                d.status,
                d.reviewNotes,
                d.modifiedAt
            FROM users u
            LEFT JOIN employeeDocumentations d ON d.userId = u.id
            WHERE u.role = 'employee' AND u.deletedAt IS NULL
            ORDER BY u.firstName, u.lastName
        `
    );

    return rows;
};

export default listEmployeeDocumentationsService;

