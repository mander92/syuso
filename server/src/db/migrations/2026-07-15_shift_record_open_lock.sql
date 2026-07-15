SET @has_shift_open_key = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'shiftRecords'
      AND COLUMN_NAME = 'openShiftKey'
);

SET @sql = IF(
    @has_shift_open_key = 0,
    'ALTER TABLE shiftRecords ADD COLUMN openShiftKey TINYINT GENERATED ALWAYS AS (CASE WHEN clockOut IS NULL AND deletedAt IS NULL THEN 1 ELSE NULL END) STORED AFTER employeeId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_shift_open_unique = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'shiftRecords'
      AND INDEX_NAME = 'uniq_shift_open_employee'
);

SET @sql = IF(
    @has_shift_open_unique = 0,
    'CREATE UNIQUE INDEX uniq_shift_open_employee ON shiftRecords (employeeId, openShiftKey)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
