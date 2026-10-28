CREATE TABLE IF NOT EXISTS salaryShiftEntries (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    shiftId CHAR(36) NOT NULL,
    hourlyRate DECIMAL(12,2) NULL,
    amountType ENUM('gross','net') NOT NULL DEFAULT 'gross',
    paidHours DECIMAL(8,2) NULL,
    modifiedBy CHAR(36) NULL,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_salary_shift_entry (employeeId, shiftId),
    INDEX idx_salary_shift_entry_shift (shiftId),
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shiftId) REFERENCES serviceScheduleShifts(id) ON DELETE CASCADE,
    FOREIGN KEY (modifiedBy) REFERENCES users(id) ON DELETE SET NULL
);
