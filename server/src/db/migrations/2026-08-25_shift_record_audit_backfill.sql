ALTER TABLE shiftRecordAuditLogs
    MODIFY action ENUM(
        'baseline_import',
        'clock_in',
        'clock_out',
        'admin_create',
        'admin_edit',
        'admin_delete',
        'work_report_close'
    ) NOT NULL;

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
SELECT
    UUID(),
    sr.id,
    sr.employeeId,
    sr.serviceId,
    NULL,
    'system',
    'baseline_import',
    'migration',
    'Importacion inicial de fichajes existentes antes de activar auditoria',
    NULL,
    JSON_OBJECT(
        'id', sr.id,
        'employeeId', sr.employeeId,
        'serviceId', sr.serviceId,
        'clockIn', sr.clockIn,
        'realClockIn', sr.realClockIn,
        'clockOut', sr.clockOut,
        'realClockOut', sr.realClockOut,
        'latitudeIn', sr.latitudeIn,
        'longitudeIn', sr.longitudeIn,
        'latitudeOut', sr.latitudeOut,
        'longitudeOut', sr.longitudeOut,
        'createdAt', sr.createdAt,
        'modifiedAt', sr.modifiedAt,
        'deletedAt', sr.deletedAt
    ),
    NULL,
    NULL,
    NULL,
    SHA2(
        CONCAT_WS(
            '|',
            sr.id,
            sr.employeeId,
            sr.serviceId,
            COALESCE(sr.clockIn, ''),
            COALESCE(sr.realClockIn, ''),
            COALESCE(sr.clockOut, ''),
            COALESCE(sr.realClockOut, ''),
            COALESCE(sr.createdAt, '')
        ),
        256
    ),
    COALESCE(sr.createdAt, CURRENT_TIMESTAMP)
FROM shiftRecords sr
WHERE NOT EXISTS (
    SELECT 1
    FROM shiftRecordAuditLogs al
    WHERE al.shiftRecordId = sr.id
);
