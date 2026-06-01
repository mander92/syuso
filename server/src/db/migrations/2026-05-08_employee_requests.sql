ALTER TABLE employeeAbsences
    MODIFY type ENUM('vacation', 'off', 'available', 'sick') NOT NULL;

CREATE TABLE IF NOT EXISTS employeeRequests (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    requestType ENUM('vacation', 'days_off', 'weekend_rest', 'availability', 'other') NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    notes TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    decidedBy CHAR(36),
    decidedAt TIMESTAMP,
    decisionNotes VARCHAR(500),
    absenceId CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_requests_employee (employeeId),
    INDEX idx_employee_requests_status (status, createdAt),
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decidedBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (absenceId) REFERENCES employeeAbsences(id) ON DELETE SET NULL
);
