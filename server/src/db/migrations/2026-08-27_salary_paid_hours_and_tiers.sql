SET @column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salaryServiceRates'
      AND COLUMN_NAME = 'tierRules'
);

SET @alter_sql := IF(
    @column_exists = 0,
    'ALTER TABLE salaryServiceRates ADD COLUMN tierRules JSON NULL AFTER fixedAmount',
    'SELECT 1'
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS salaryPaidServiceHours (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    serviceId CHAR(36) NOT NULL,
    settlementMonth CHAR(7) NOT NULL,
    hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500) NULL,
    createdBy CHAR(36) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_salary_paid_hours_employee_month (employeeId, settlementMonth),
    INDEX idx_salary_paid_hours_service_month (serviceId, settlementMonth),
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);
