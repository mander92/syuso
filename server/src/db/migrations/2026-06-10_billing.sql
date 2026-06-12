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

SET @has_services_billing_concept = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'billingConcept'
);

SET @sql = IF(
    @has_services_billing_concept = 0,
    'ALTER TABLE services ADD COLUMN billingConcept VARCHAR(255) NULL AFTER billingEndDay',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS billingRecords (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36),
    clientId CHAR(36),
    manualClientName VARCHAR(255),
    manualTaxId VARCHAR(50),
    manualAddress VARCHAR(255),
    manualContactEmail VARCHAR(255),
    manualDelegation VARCHAR(100),
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
    invoiceSeries VARCHAR(20),
    invoiceSequence INT UNSIGNED,
    invoiceNumber VARCHAR(50),
    invoiceGeneratedAt TIMESTAMP NULL,
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
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (requestedBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sentBy) REFERENCES users(id) ON DELETE SET NULL
);

SET @billing_service_fk = (
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'serviceId'
      AND REFERENCED_TABLE_NAME = 'services'
    LIMIT 1
);

SET @sql = IF(
    @billing_service_fk IS NOT NULL,
    CONCAT('ALTER TABLE billingRecords DROP FOREIGN KEY ', @billing_service_fk),
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE billingRecords MODIFY COLUMN serviceId CHAR(36) NULL;

SET @billing_service_fk_after = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'serviceId'
      AND REFERENCED_TABLE_NAME = 'services'
);

SET @sql = IF(
    @billing_service_fk_after = 0,
    'ALTER TABLE billingRecords ADD CONSTRAINT fk_billing_records_service_id FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_manual_client_name = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'manualClientName'
);

SET @sql = IF(
    @has_billing_manual_client_name = 0,
    'ALTER TABLE billingRecords ADD COLUMN manualClientName VARCHAR(255) NULL AFTER clientId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_manual_tax_id = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'manualTaxId'
);

SET @sql = IF(
    @has_billing_manual_tax_id = 0,
    'ALTER TABLE billingRecords ADD COLUMN manualTaxId VARCHAR(50) NULL AFTER manualClientName',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_manual_address = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'manualAddress'
);

SET @sql = IF(
    @has_billing_manual_address = 0,
    'ALTER TABLE billingRecords ADD COLUMN manualAddress VARCHAR(255) NULL AFTER manualTaxId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_manual_contact_email = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'manualContactEmail'
);

SET @sql = IF(
    @has_billing_manual_contact_email = 0,
    'ALTER TABLE billingRecords ADD COLUMN manualContactEmail VARCHAR(255) NULL AFTER manualAddress',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_manual_delegation = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'manualDelegation'
);

SET @sql = IF(
    @has_billing_manual_delegation = 0,
    'ALTER TABLE billingRecords ADD COLUMN manualDelegation VARCHAR(100) NULL AFTER manualContactEmail',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS billingIgnoredPeriods (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36) NOT NULL,
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
    reason VARCHAR(255),
    ignoredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ignoredBy CHAR(36),
    deletedAt TIMESTAMP NULL,
    INDEX idx_billing_ignored_service_period (serviceId, periodStart, periodEnd),
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (ignoredBy) REFERENCES users(id) ON DELETE SET NULL
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

SET @has_billing_invoice_series = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'invoiceSeries'
);

SET @sql = IF(
    @has_billing_invoice_series = 0,
    'ALTER TABLE billingRecords ADD COLUMN invoiceSeries VARCHAR(20) NULL AFTER invoiceFileName',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_invoice_sequence = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'invoiceSequence'
);

SET @sql = IF(
    @has_billing_invoice_sequence = 0,
    'ALTER TABLE billingRecords ADD COLUMN invoiceSequence INT UNSIGNED NULL AFTER invoiceSeries',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_invoice_number = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'invoiceNumber'
);

SET @sql = IF(
    @has_billing_invoice_number = 0,
    'ALTER TABLE billingRecords ADD COLUMN invoiceNumber VARCHAR(50) NULL AFTER invoiceSequence',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_invoice_generated_at = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billingRecords'
      AND COLUMN_NAME = 'invoiceGeneratedAt'
);

SET @sql = IF(
    @has_billing_invoice_generated_at = 0,
    'ALTER TABLE billingRecords ADD COLUMN invoiceGeneratedAt TIMESTAMP NULL AFTER invoiceNumber',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
