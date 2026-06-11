SET @has_services_billing_start_day = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'billingStartDay'
);

SET @sql = IF(
    @has_services_billing_start_day = 0,
    'ALTER TABLE services ADD COLUMN billingStartDay TINYINT UNSIGNED NULL AFTER hourlyRate',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_services_billing_end_day = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'billingEndDay'
);

SET @sql = IF(
    @has_services_billing_end_day = 0,
    'ALTER TABLE services ADD COLUMN billingEndDay TINYINT UNSIGNED NULL AFTER billingStartDay',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS billingRecords (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36) NOT NULL,
    clientId CHAR(36),
    concept VARCHAR(255),
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
    totalHours DECIMAL(10,2) NOT NULL DEFAULT 0,
    hourlyRate DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    vatPercent DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    vatAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    requestEmails TEXT,
    requestCcEmails TEXT,
    requestNotes VARCHAR(1000),
    requestedAt TIMESTAMP NULL,
    requestedBy CHAR(36),
    invoiceFilePath VARCHAR(255),
    invoiceFileName VARCHAR(255),
    clientEmails TEXT,
    clientCcEmails TEXT,
    sentAt TIMESTAMP NULL,
    sentBy CHAR(36),
    status ENUM('pending_request','requested','invoice_received','sent','cancelled') NOT NULL DEFAULT 'pending_request',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_billing_service_period (serviceId, periodStart, periodEnd),
    INDEX idx_billing_status (status),
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (requestedBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sentBy) REFERENCES users(id) ON DELETE SET NULL
);

SET @has_billing_concept = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'concept'
);

SET @sql = IF(
    @has_billing_concept = 0,
    'ALTER TABLE billingRecords ADD COLUMN concept VARCHAR(255) NULL AFTER clientId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_subtotal = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'subtotal'
);

SET @sql = IF(
    @has_billing_subtotal = 0,
    'ALTER TABLE billingRecords ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER hourlyRate',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_vat_percent = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'vatPercent'
);

SET @sql = IF(
    @has_billing_vat_percent = 0,
    'ALTER TABLE billingRecords ADD COLUMN vatPercent DECIMAL(5,2) NOT NULL DEFAULT 21.00 AFTER subtotal',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_vat_amount = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'vatAmount'
);

SET @sql = IF(
    @has_billing_vat_amount = 0,
    'ALTER TABLE billingRecords ADD COLUMN vatAmount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER vatPercent',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
