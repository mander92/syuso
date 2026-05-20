SET @current_database = DATABASE();

SET @add_dashboard_permissions_sql = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @current_database
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'dashboardPermissions'
        ),
        'SELECT 1',
        'ALTER TABLE users ADD COLUMN dashboardPermissions JSON NULL AFTER role'
    )
);

PREPARE add_dashboard_permissions_stmt FROM @add_dashboard_permissions_sql;
EXECUTE add_dashboard_permissions_stmt;
DEALLOCATE PREPARE add_dashboard_permissions_stmt;
