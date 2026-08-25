CREATE TABLE IF NOT EXISTS shiftRecordAuditLogs (
    id CHAR(36) PRIMARY KEY NOT NULL,
    shiftRecordId CHAR(36) NULL,
    employeeId CHAR(36) NULL,
    serviceId CHAR(36) NULL,
    actorUserId CHAR(36) NULL,
    actorRole VARCHAR(40) NULL,
    action ENUM(
        'clock_in',
        'clock_out',
        'admin_create',
        'admin_edit',
        'admin_delete',
        'work_report_close'
    ) NOT NULL,
    source VARCHAR(80) NULL,
    reason VARCHAR(500) NULL,
    oldValue JSON NULL,
    newValue JSON NULL,
    requestIp VARCHAR(80) NULL,
    userAgent VARCHAR(1000) NULL,
    previousHash CHAR(64) NULL,
    rowHash CHAR(64) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_shift_record_audit_record (shiftRecordId),
    INDEX idx_shift_record_audit_employee_created (employeeId, createdAt),
    INDEX idx_shift_record_audit_service_created (serviceId, createdAt),
    INDEX idx_shift_record_audit_actor_created (actorUserId, createdAt),
    CONSTRAINT fk_shift_record_audit_record
        FOREIGN KEY (shiftRecordId) REFERENCES shiftRecords(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_shift_record_audit_employee
        FOREIGN KEY (employeeId) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_shift_record_audit_actor
        FOREIGN KEY (actorUserId) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_shift_record_audit_service
        FOREIGN KEY (serviceId) REFERENCES services(id)
        ON DELETE SET NULL
);
