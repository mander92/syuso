CREATE TABLE IF NOT EXISTS payrollImports (
    id CHAR(36) PRIMARY KEY NOT NULL,
    uploadMode ENUM('multiple','onePerPage') NOT NULL DEFAULT 'multiple',
    originalFileName VARCHAR(255),
    totalFiles INT UNSIGNED NOT NULL DEFAULT 0,
    matchedCount INT UNSIGNED NOT NULL DEFAULT 0,
    unmatchedCount INT UNSIGNED NOT NULL DEFAULT 0,
    uploadedBy CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payrolls (
    id CHAR(36) PRIMARY KEY NOT NULL,
    importId CHAR(36),
    employeeId CHAR(36),
    filePath VARCHAR(255) NOT NULL,
    originalFileName VARCHAR(255),
    detectedName VARCHAR(150),
    detectedDni VARCHAR(20),
    payrollMonth CHAR(7),
    status ENUM('unmatched','matched','published','rejected') NOT NULL DEFAULT 'unmatched',
    uploadedBy CHAR(36),
    publishedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_payroll_employee_month (employeeId, payrollMonth),
    INDEX idx_payroll_status (status),
    FOREIGN KEY (importId) REFERENCES payrollImports(id) ON DELETE SET NULL,
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
);
