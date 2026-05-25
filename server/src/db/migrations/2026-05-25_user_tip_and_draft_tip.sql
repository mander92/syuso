SET @has_users_tip = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'tip'
);

SET @sql = IF(
    @has_users_tip = 0,
    'ALTER TABLE users ADD COLUMN tip VARCHAR(30) NULL AFTER dni',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_drafts_tip = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employeeDocumentationDrafts'
      AND COLUMN_NAME = 'tip'
);

SET @sql = IF(
    @has_drafts_tip = 0,
    'ALTER TABLE employeeDocumentationDrafts ADD COLUMN tip VARCHAR(30) NULL AFTER dni',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
