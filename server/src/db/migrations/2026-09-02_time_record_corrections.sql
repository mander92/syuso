CREATE TABLE IF NOT EXISTS shiftRecordCorrectionRequests (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    serviceId CHAR(36) NULL,
    scheduleShiftId CHAR(36) NULL,
    shiftRecordId CHAR(36) NULL,
    requestedClockIn TIMESTAMP NULL,
    requestedClockOut TIMESTAMP NULL,
    reason VARCHAR(1000) NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewedBy CHAR(36) NULL,
    reviewedAt TIMESTAMP NULL,
    reviewNotes VARCHAR(1000) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_shift_record_correction_employee (employeeId, status, createdAt),
    INDEX idx_shift_record_correction_service (serviceId, createdAt),
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (scheduleShiftId) REFERENCES serviceScheduleShifts(id) ON DELETE SET NULL,
    FOREIGN KEY (shiftRecordId) REFERENCES shiftRecords(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE acknowledgements
    MODIFY subjectType ENUM('communication','service_assignment','schedule','document','payroll','time_record') NOT NULL;
