import path from 'path';

import getPool from '../../db/getPool.js';
import createExcelUtil from '../../utils/createExcelUtil.js';
import { formatDateMadrid } from '../../utils/dateTimeMadrid.js';

const parseJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const actionLabels = {
    clock_in: 'Entrada fichada',
    clock_out: 'Salida fichada',
    admin_create: 'Fichaje creado por admin',
    admin_edit: 'Fichaje editado por admin',
    admin_delete: 'Fichaje eliminado por admin',
    work_report_close: 'Cierre con parte',
};

const normalizeAuditRow = (row) => ({
    id: row.id,
    shiftRecordId: row.shiftRecordId,
    employeeId: row.employeeId,
    employeeName:
        `${row.employeeFirstName || ''} ${row.employeeLastName || ''}`.trim() ||
        row.employeeEmail ||
        '',
    employeeEmail: row.employeeEmail,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    serviceType: row.serviceType,
    serviceCity: row.serviceCity,
    actorUserId: row.actorUserId,
    actorName:
        `${row.actorFirstName || ''} ${row.actorLastName || ''}`.trim() ||
        row.actorEmail ||
        '',
    actorEmail: row.actorEmail,
    actorRole: row.actorRole,
    action: row.action,
    actionLabel: actionLabels[row.action] || row.action,
    source: row.source,
    reason: row.reason,
    oldValue: parseJson(row.oldValue),
    newValue: parseJson(row.newValue),
    requestIp: row.requestIp,
    userAgent: row.userAgent,
    previousHash: row.previousHash,
    rowHash: row.rowHash,
    createdAt: row.createdAt,
});

const listShiftRecordAuditLogsService = async ({
    employeeId,
    serviceId,
    action,
    startDate,
    endDate,
    generateExcel = false,
    delegationNames = [],
}) => {
    const pool = await getPool();
    const values = [];
    let query = `
        SELECT
            al.*,
            employee.firstName AS employeeFirstName,
            employee.lastName AS employeeLastName,
            employee.email AS employeeEmail,
            actor.firstName AS actorFirstName,
            actor.lastName AS actorLastName,
            actor.email AS actorEmail,
            services.name AS serviceName,
            services.type AS serviceType,
            addresses.city AS serviceCity
        FROM shiftRecordAuditLogs al
        LEFT JOIN users employee ON employee.id = al.employeeId
        LEFT JOIN users actor ON actor.id = al.actorUserId
        LEFT JOIN services ON services.id = al.serviceId
        LEFT JOIN addresses ON addresses.id = services.addressId
        WHERE 1 = 1
    `;

    if (employeeId) {
        query += ' AND al.employeeId = ?';
        values.push(employeeId);
    }

    if (serviceId) {
        query += ' AND al.serviceId = ?';
        values.push(serviceId);
    }

    if (action) {
        query += ' AND al.action = ?';
        values.push(action);
    }

    if (startDate) {
        query += ' AND al.createdAt >= ?';
        values.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
        query += ' AND al.createdAt <= ?';
        values.push(`${endDate} 23:59:59`);
    }

    if (delegationNames.length) {
        query += ` AND services.province IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        values.push(...delegationNames);
    }

    query += ' ORDER BY al.createdAt DESC LIMIT 1000';

    const [rows] = await pool.query(query, values);
    const data = rows.map(normalizeAuditRow);

    if (!generateExcel) return { logs: data };

    const excelRows = data.map((row) => ({
        createdAt: formatDateMadrid(row.createdAt),
        action: row.actionLabel,
        employeeName: row.employeeName,
        employeeEmail: row.employeeEmail || '',
        serviceName: row.serviceName || '',
        serviceCity: row.serviceCity || '',
        actorName: row.actorName,
        actorEmail: row.actorEmail || '',
        actorRole: row.actorRole || '',
        requestIp: row.requestIp || '',
        reason: row.reason || '',
        previousHash: row.previousHash || '',
        rowHash: row.rowHash || '',
        oldValue: row.oldValue ? JSON.stringify(row.oldValue) : '',
        newValue: row.newValue ? JSON.stringify(row.newValue) : '',
    }));

    const filePath = await createExcelUtil(
        [
            {
                name: 'Auditoria fichajes',
                columns: [
                    { header: 'Fecha auditoria', key: 'createdAt', width: 22 },
                    { header: 'Accion', key: 'action', width: 24 },
                    { header: 'Trabajador', key: 'employeeName', width: 28 },
                    { header: 'Email trabajador', key: 'employeeEmail', width: 30 },
                    { header: 'Servicio', key: 'serviceName', width: 32 },
                    { header: 'Ciudad', key: 'serviceCity', width: 18 },
                    { header: 'Actor', key: 'actorName', width: 28 },
                    { header: 'Email actor', key: 'actorEmail', width: 30 },
                    { header: 'Rol actor', key: 'actorRole', width: 16 },
                    { header: 'IP', key: 'requestIp', width: 20 },
                    { header: 'Motivo', key: 'reason', width: 36 },
                    { header: 'Hash anterior', key: 'previousHash', width: 68 },
                    { header: 'Hash registro', key: 'rowHash', width: 68 },
                    { header: 'Valor anterior', key: 'oldValue', width: 60 },
                    { header: 'Valor nuevo', key: 'newValue', width: 60 },
                ],
                rows: excelRows,
            },
        ],
        null,
        'shiftRecordAuditLogs.xlsx'
    );

    return {
        logs: data,
        excelFilePath: `/uploads/documents/${path.basename(filePath)}`,
    };
};

export default listShiftRecordAuditLogsService;
