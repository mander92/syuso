CREATE TABLE IF NOT EXISTS salaryAbsencePayments (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    settlementMonth CHAR(7) NOT NULL,
    absenceType ENUM('vacation','sick') NOT NULL,
    days DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amountType ENUM('gross','net') NOT NULL DEFAULT 'gross',
    notes VARCHAR(500) NULL,
    createdBy CHAR(36) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    UNIQUE KEY uniq_salary_absence_employee_month_type (employeeId, settlementMonth, absenceType, deletedAt),
    INDEX idx_salary_absence_employee_month (employeeId, settlementMonth),
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);
