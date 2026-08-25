import getPool from '../../db/getPool.js';
import createShiftRecordAuditLogService from './createShiftRecordAuditLogService.js';

const editShiftRecordsService = async (
    clockIn,
    clockOut,
    shiftRecordId,
    actor = {}
) => {
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
            longitudeOut
        FROM shiftRecords
        WHERE id = ?
        LIMIT 1
        `,
        [shiftRecordId]
    );
    const before = beforeRows[0] || null;

    await pool.query(
        `
        UPDATE shiftRecords
        SET clockIn = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            clockOut = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            realClockIn = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            realClockOut = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s')
        WHERE id = ?
        `,
        [clockIn, clockOut, clockIn, clockOut, shiftRecordId]
    );

    const [afterRows] = await pool.query(
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
            longitudeOut
        FROM shiftRecords
        WHERE id = ?
        LIMIT 1
        `,
        [shiftRecordId]
    );
    const after = afterRows[0] || null;

    await createShiftRecordAuditLogService({
        shiftRecordId,
        employeeId: before?.employeeId || after?.employeeId,
        serviceId: before?.serviceId || after?.serviceId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: 'admin_edit',
        source: 'admin_panel',
        reason: actor.reason || 'Edicion manual de fichaje',
        oldValue: before,
        newValue: after,
        req: actor.req,
    });
};

export default editShiftRecordsService;
