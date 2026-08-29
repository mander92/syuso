CREATE TABLE IF NOT EXISTS acknowledgements (
    id CHAR(36) PRIMARY KEY NOT NULL,
    subjectType ENUM('communication','service_assignment','schedule','document','payroll') NOT NULL,
    subjectId CHAR(36) NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NULL,
    url VARCHAR(500) NULL,
    requiresAcceptance BOOLEAN DEFAULT true,
    createdBy CHAR(36) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_acknowledgements_subject (subjectType, subjectId),
    INDEX idx_acknowledgements_created (createdAt),
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS acknowledgementRecipients (
    id CHAR(36) PRIMARY KEY NOT NULL,
    acknowledgementId CHAR(36) NOT NULL,
    userId CHAR(36) NOT NULL,
    deliveredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seenAt TIMESTAMP NULL,
    acceptedAt TIMESTAMP NULL,
    lastEventAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastIp VARCHAR(80) NULL,
    lastUserAgent VARCHAR(1000) NULL,
    UNIQUE KEY uniq_ack_recipient (acknowledgementId, userId),
    INDEX idx_ack_recipient_user (userId, acceptedAt, seenAt),
    FOREIGN KEY (acknowledgementId) REFERENCES acknowledgements(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acknowledgementEvents (
    id CHAR(36) PRIMARY KEY NOT NULL,
    acknowledgementRecipientId CHAR(36) NOT NULL,
    eventType ENUM('delivered','seen','accepted') NOT NULL,
    ip VARCHAR(80) NULL,
    userAgent VARCHAR(1000) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ack_event_recipient_created (acknowledgementRecipientId, createdAt),
    FOREIGN KEY (acknowledgementRecipientId)
        REFERENCES acknowledgementRecipients(id)
        ON DELETE CASCADE
);
