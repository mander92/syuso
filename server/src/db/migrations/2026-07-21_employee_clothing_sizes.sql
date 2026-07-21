SET @has_employee_polo_size = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employeeDocumentations'
      AND COLUMN_NAME = 'poloSize'
);

SET @sql = IF(
    @has_employee_polo_size = 0,
    'ALTER TABLE employeeDocumentations ADD COLUMN poloSize VARCHAR(10) NULL AFTER socialSecurityNumber',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_employee_pants_size = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employeeDocumentations'
      AND COLUMN_NAME = 'pantsSize'
);

SET @sql = IF(
    @has_employee_pants_size = 0,
    'ALTER TABLE employeeDocumentations ADD COLUMN pantsSize VARCHAR(10) NULL AFTER poloSize',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_draft_polo_size = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employeeDocumentationDrafts'
      AND COLUMN_NAME = 'poloSize'
);

SET @sql = IF(
    @has_draft_polo_size = 0,
    'ALTER TABLE employeeDocumentationDrafts ADD COLUMN poloSize VARCHAR(10) NULL AFTER socialSecurityNumber',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_draft_pants_size = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employeeDocumentationDrafts'
      AND COLUMN_NAME = 'pantsSize'
);

SET @sql = IF(
    @has_draft_pants_size = 0,
    'ALTER TABLE employeeDocumentationDrafts ADD COLUMN pantsSize VARCHAR(10) NULL AFTER poloSize',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
