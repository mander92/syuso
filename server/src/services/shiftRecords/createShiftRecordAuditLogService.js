import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

import getPool from '../../db/getPool.js';

const normalizeSnapshot = (value) => {
    if (!value) return null;
    return JSON.stringify(value);
};

const getRequestIp = (req) =>
    req?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;

const createShiftRecordAuditLogService = async ({
    shiftRecordId,
    employeeId,
    serviceId,
    actorUserId,
    actorRole,
    action,
    source,
    reason,
    oldValue,
    newValue,
    req,
}) => {
    if (!action) return null;

    const pool = await getPool();
    const id = uuid();
    const createdAt = new Date();
    const oldValueJson = normalizeSnapshot(oldValue);
    const newValueJson = normalizeSnapshot(newValue);
    const requestIp = getRequestIp(req);
    const userAgent = req?.headers?.['user-agent'] || null;
    const [[lastLog]] = await pool.query(
        `
        SELECT rowHash
        FROM shiftRecordAuditLogs
        ORDER BY createdAt DESC, id DESC
        LIMIT 1
        `
    );
    const previousHash = lastLog?.rowHash || null;
    const rowHash = crypto
        .createHash('sha256')
        .update(
            JSON.stringify({
                id,
                shiftRecordId: shiftRecordId || null,
                employeeId: employeeId || null,
                serviceId: serviceId || null,
                actorUserId: actorUserId || null,
                actorRole: actorRole || null,
                action,
                source: source || null,
                reason: reason || null,
                oldValue: oldValueJson,
                newValue: newValueJson,
                requestIp,
                userAgent,
                previousHash,
                createdAt: createdAt.toISOString(),
            })
        )
        .digest('hex');

    await pool.query(
        `
        INSERT INTO shiftRecordAuditLogs (
            id,
            shiftRecordId,
            employeeId,
            serviceId,
            actorUserId,
            actorRole,
            action,
            source,
            reason,
            oldValue,
            newValue,
            requestIp,
            userAgent,
            previousHash,
            rowHash,
            createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            shiftRecordId || null,
            employeeId || null,
            serviceId || null,
            actorUserId || null,
            actorRole || null,
            action,
            source || null,
            reason || null,
            oldValueJson,
            newValueJson,
            requestIp,
            userAgent,
            previousHash,
            rowHash,
            createdAt,
        ]
    );

    return id;
};

export default createShiftRecordAuditLogService;
