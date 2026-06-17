import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

export const listPayrollEmployees = async ({ viewerId, viewerRole }) => {
    const pool = await getPool();
    const values = [];
    let delegationFilter = '';

    if (viewerRole === 'admin') {
        const delegations = await selectAdminDelegationNamesService(viewerId);
        if (!delegations.length) return [];
        delegationFilter = ` AND city IN (${delegations.map(() => '?').join(', ')})`;
        values.push(...delegations);
    }

    const [rows] = await pool.query(
        `
            SELECT id, firstName, lastName, email, dni, city, active
            FROM users
            WHERE role = 'employee'
              AND deletedAt IS NULL
              ${delegationFilter}
            ORDER BY firstName, lastName
        `,
        values
    );

    return rows;
};

export const createPayrollImport = async ({
    uploadMode,
    originalFileName,
    uploadedBy,
}) => {
    const pool = await getPool();
    const importId = uuid();

    await pool.query(
        `
            INSERT INTO payrollImports
                (id, uploadMode, originalFileName, uploadedBy)
            VALUES (?, ?, ?, ?)
        `,
        [importId, uploadMode, originalFileName || null, uploadedBy]
    );

    return importId;
};

export const insertPayroll = async ({
    importId,
    employeeId,
    filePath,
    originalFileName,
    detectedName,
    detectedDni,
    payrollMonth,
    status,
    uploadedBy,
}) => {
    const pool = await getPool();
    const [existing] = await pool.query(
        `
            SELECT id
            FROM payrolls
            WHERE originalFileName = ?
              AND payrollMonth <=> ?
              AND deletedAt IS NULL
            LIMIT 1
        `,
        [originalFileName || null, payrollMonth || null]
    );

    if (existing.length) {
        const id = existing[0].id;
        await pool.query(
            `
                UPDATE payrolls
                SET importId = ?,
                    employeeId = ?,
                    filePath = ?,
                    detectedName = ?,
                    detectedDni = ?,
                    status = ?,
                    uploadedBy = ?,
                    publishedAt = CASE
                        WHEN ? = 'published' THEN COALESCE(publishedAt, CURRENT_TIMESTAMP)
                        ELSE publishedAt
                    END
                WHERE id = ?
            `,
            [
                importId,
                employeeId || null,
                filePath,
                detectedName || null,
                detectedDni || null,
                status,
                uploadedBy,
                status,
                id,
            ]
        );

        return id;
    }

    const id = uuid();

    await pool.query(
        `
            INSERT INTO payrolls
                (id, importId, employeeId, filePath, originalFileName, detectedName,
                 detectedDni, payrollMonth, status, uploadedBy, publishedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            importId,
            employeeId || null,
            filePath,
            originalFileName || null,
            detectedName || null,
            detectedDni || null,
            payrollMonth || null,
            status,
            uploadedBy,
            status === 'published' ? new Date() : null,
        ]
    );

    return id;
};

export const updatePayrollImportStats = async ({
    importId,
    totalFiles,
    matchedCount,
    unmatchedCount,
}) => {
    const pool = await getPool();
    await pool.query(
        `
            UPDATE payrollImports
            SET totalFiles = ?, matchedCount = ?, unmatchedCount = ?
            WHERE id = ?
        `,
        [totalFiles, matchedCount, unmatchedCount, importId]
    );
};

export const listPayrolls = async ({
    viewerId,
    viewerRole,
    employeeId,
    month,
    status,
}) => {
    const pool = await getPool();
    const values = [];
    let sql = `
        SELECT
            p.id,
            p.importId,
            p.employeeId,
            p.originalFileName,
            p.detectedName,
            p.detectedDni,
            p.payrollMonth,
            p.status,
            p.publishedAt,
            p.createdAt,
            u.firstName,
            u.lastName,
            u.email,
            u.city
        FROM payrolls p
        LEFT JOIN users u ON u.id = p.employeeId
        WHERE p.deletedAt IS NULL
    `;

    if (viewerRole === 'employee') {
        sql += " AND p.employeeId = ? AND p.status = 'published'";
        values.push(viewerId);
    } else if (viewerRole === 'admin') {
        const delegations = await selectAdminDelegationNamesService(viewerId);
        if (!delegations.length) return [];
        sql += ` AND (u.city IN (${delegations
            .map(() => '?')
            .join(', ')}) OR p.employeeId IS NULL)`;
        values.push(...delegations);
    }

    if (employeeId && viewerRole !== 'employee') {
        sql += ' AND p.employeeId = ?';
        values.push(employeeId);
    }

    if (month) {
        sql += ' AND p.payrollMonth = ?';
        values.push(month);
    }

    if (status && viewerRole !== 'employee') {
        sql += ' AND p.status = ?';
        values.push(status);
    }

    sql += ' ORDER BY p.payrollMonth DESC, u.firstName, u.lastName, p.createdAt DESC';

    const [rows] = await pool.query(sql, values);
    return rows;
};

export const getPayrollById = async (payrollId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
            SELECT p.*, u.firstName, u.lastName, u.email, u.city
            FROM payrolls p
            LEFT JOIN users u ON u.id = p.employeeId
            WHERE p.id = ? AND p.deletedAt IS NULL
        `,
        [payrollId]
    );
    return rows[0] || null;
};

export const updatePayroll = async (payrollId, data) => {
    const pool = await getPool();
    const allowed = ['employeeId', 'payrollMonth', 'status'];
    const fields = [];
    const values = [];

    allowed.forEach((field) => {
        if (data[field] !== undefined) {
            fields.push(`${field} = ?`);
            values.push(data[field] || null);
        }
    });

    if (data.status === 'published') {
        fields.push('publishedAt = COALESCE(publishedAt, CURRENT_TIMESTAMP)');
    }

    if (!fields.length) generateErrorUtil('No hay cambios para guardar', 400);

    values.push(payrollId);
    await pool.query(
        `
            UPDATE payrolls
            SET ${fields.join(', ')}
            WHERE id = ?
        `,
        values
    );
};

export const deletePayroll = async (payrollId) => {
    const pool = await getPool();
    await pool.query(
        `
            UPDATE payrolls
            SET deletedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        [payrollId]
    );
};
