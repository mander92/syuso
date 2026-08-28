SET @column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'serviceScheduleTemplates'
      AND COLUMN_NAME = 'employeeId'
);

SET @alter_sql := IF(
    @column_exists = 0,
    'ALTER TABLE serviceScheduleTemplates ADD COLUMN employeeId CHAR(36) NULL AFTER shiftTypeId',
    'SELECT 1'
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
