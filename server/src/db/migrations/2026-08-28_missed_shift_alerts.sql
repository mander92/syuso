CREATE TABLE IF NOT EXISTS serviceScheduleShiftAlerts (
    id CHAR(36) PRIMARY KEY NOT NULL,
    scheduleShiftId CHAR(36) NOT NULL,
    employeeId CHAR(36) NOT NULL,
    serviceId CHAR(36) NOT NULL,
    alertType ENUM('missed_clock_in') NOT NULL DEFAULT 'missed_clock_in',
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_service_schedule_shift_alert (scheduleShiftId, alertType),
    INDEX idx_service_schedule_shift_alert_employee (employeeId, sentAt),
    INDEX idx_service_schedule_shift_alert_service (serviceId, sentAt),
    FOREIGN KEY (scheduleShiftId) REFERENCES serviceScheduleShifts(id) ON DELETE CASCADE,
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);
