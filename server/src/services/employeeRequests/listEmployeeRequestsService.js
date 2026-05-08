import getPool from '../../db/getPool.js';

const baseSelect = `
    SELECT
        er.id,
        er.employeeId,
        er.requestType,
        er.startDate,
        er.endDate,
        er.notes,
        er.status,
        er.decidedBy,
        er.decidedAt,
        er.decisionNotes,
        er.absenceId,
        er.createdAt,
        CONCAT(COALESCE(employee.firstName, ''), ' ', COALESCE(employee.lastName, '')) AS employeeName,
        employee.email AS employeeEmail,
        CONCAT(COALESCE(admin.firstName, ''), ' ', COALESCE(admin.lastName, '')) AS decidedByName
    FROM employeeRequests er
    INNER JOIN users employee ON employee.id = er.employeeId
    LEFT JOIN users admin ON admin.id = er.decidedBy
`;

export const listUserEmployeeRequestsService = async (employeeId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        ${baseSelect}
        WHERE er.employeeId = ?
        ORDER BY er.createdAt DESC
        `,
        [employeeId]
    );
    return rows;
};

export const listAdminEmployeeRequestsService = async () => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        ${baseSelect}
        ORDER BY FIELD(er.status, 'pending', 'approved', 'rejected'), er.createdAt DESC
        `
    );
    return rows;
};
