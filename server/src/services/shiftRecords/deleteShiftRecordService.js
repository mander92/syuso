import getPool from '../../db/getPool.js';
import createShiftRecordAuditLogService from './createShiftRecordAuditLogService.js';

const deleteShiftRecordService = async (shiftRecordId, actor = {}) => {
    const pool = await getPool();

    const [beforeRows] = await pool.query(
        `
        SELECT
            id,
            serviceId,
            employeeId,
            clockIn,
            realClockIn,
            clockOut,
            realClockOut,
            latitudeIn,
            longitudeIn,
            latitudeOut,
            longitudeOut,
            createdAt,
            modifiedAt
        FROM shiftRecords
        WHERE id = ?
        LIMIT 1
        `,
        [shiftRecordId]
    );
    const before = beforeRows[0] || null;

    await createShiftRecordAuditLogService({
        shiftRecordId,
        employeeId: before?.employeeId,
        serviceId: before?.serviceId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: 'admin_delete',
        source: 'admin_panel',
        reason: actor.reason || 'Eliminacion manual de fichaje',
        oldValue: before,
        req: actor.req,
    });

    await pool.query(
        `
        DELETE FROM workReportDrafts WHERE shiftRecordId = ?
        `,
        [shiftRecordId]
    );

    await pool.query(
        `
        DELETE FROM shiftRecords WHERE id = ?
        `,
        [shiftRecordId]
    );
};

export default deleteShiftRecordService;
