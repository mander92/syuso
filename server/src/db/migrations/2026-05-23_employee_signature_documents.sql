CREATE TABLE IF NOT EXISTS employeeSignatureDocuments (
    id CHAR(36) PRIMARY KEY NOT NULL,
    employeeId CHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    documentType ENUM(
        'epi',
        'information',
        'dataProtection',
        'contract',
        'medical',
        'riskAssessment',
        'tax',
        'workday',
        'other'
    ) NOT NULL DEFAULT 'other',
    originalFilePath VARCHAR(255) NOT NULL,
    originalFileName VARCHAR(255),
    dueDate DATE NULL,
    periodMonth CHAR(7) NULL,
    signaturePath VARCHAR(255),
    status ENUM('pending','signed') NOT NULL DEFAULT 'pending',
    signedAt TIMESTAMP NULL,
    createdBy CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    FOREIGN KEY (employeeId) REFERENCES users(id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
);
