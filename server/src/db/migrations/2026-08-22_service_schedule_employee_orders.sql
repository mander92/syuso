CREATE TABLE IF NOT EXISTS serviceScheduleEmployeeOrders (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36) NOT NULL,
    employeeId CHAR(36) NOT NULL,
    position INT UNSIGNED NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_service_schedule_employee_order (serviceId, employeeId),
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE
);
