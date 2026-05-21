CREATE TABLE IF NOT EXISTS employeeDocumentations (
    id CHAR(36) PRIMARY KEY NOT NULL,
    userId CHAR(36) NOT NULL UNIQUE,
    birthDate DATE,
    bankAccount VARCHAR(40),
    dniFrontPath VARCHAR(255),
    dniBackPath VARCHAR(255),
    tipFrontPath VARCHAR(255),
    tipBackPath VARCHAR(255),
    address VARCHAR(255),
    phone VARCHAR(20),
    socialSecurityNumber VARCHAR(40),
    status ENUM('pending', 'submitted', 'reviewed', 'rejected') DEFAULT 'pending',
    reviewNotes VARCHAR(500),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
);
