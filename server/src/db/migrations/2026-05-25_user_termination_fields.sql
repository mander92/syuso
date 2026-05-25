SET @has_users_termination_date = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'terminationDate'
);

SET @sql = IF(
    @has_users_termination_date = 0,
    'ALTER TABLE users ADD COLUMN terminationDate DATE NULL AFTER active',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_termination_reason = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'terminationReason'
);

SET @sql = IF(
    @has_users_termination_reason = 0,
    'ALTER TABLE users ADD COLUMN terminationReason VARCHAR(100) NULL AFTER terminationDate',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
