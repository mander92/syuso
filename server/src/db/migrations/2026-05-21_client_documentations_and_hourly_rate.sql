CREATE TABLE IF NOT EXISTS clientDocumentations (
    id CHAR(36) PRIMARY KEY NOT NULL,
    clientId CHAR(36) NOT NULL UNIQUE,
    displayName VARCHAR(150),
    taxId VARCHAR(20),
    phone VARCHAR(30),
    email VARCHAR(150),
    contactPerson VARCHAR(150),
    acceptedBudgetPath VARCHAR(255),
    serviceContractPath VARCHAR(255),
    authorizations TEXT,
    paymentMethod VARCHAR(100),
    status ENUM('pending', 'reviewed', 'rejected') DEFAULT 'pending',
    reviewNotes VARCHAR(500),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES users(id)
);

SET @add_hourly_rate_sql = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'services'
              AND COLUMN_NAME = 'hourlyRate'
        ),
        'SELECT "services.hourlyRate ya existe" AS info',
        'ALTER TABLE services ADD COLUMN hourlyRate DECIMAL(10,2) NULL AFTER hours'
    )
);

PREPARE add_hourly_rate_stmt FROM @add_hourly_rate_sql;
EXECUTE add_hourly_rate_stmt;
DEALLOCATE PREPARE add_hourly_rate_stmt;
