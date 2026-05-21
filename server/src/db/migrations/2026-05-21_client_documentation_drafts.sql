CREATE TABLE IF NOT EXISTS clientDocumentationDrafts (
    id CHAR(36) PRIMARY KEY NOT NULL,
    displayName VARCHAR(150),
    taxId VARCHAR(20),
    phone VARCHAR(30),
    email VARCHAR(150),
    contactPerson VARCHAR(150),
    acceptedBudgetPath VARCHAR(255),
    serviceContractPath VARCHAR(255),
    authorizations TEXT,
    paymentMethod VARCHAR(100),
    status ENUM('draft', 'pending', 'reviewed', 'converted', 'rejected') DEFAULT 'draft',
    reviewNotes VARCHAR(500),
    linkedClientId CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (linkedClientId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clientDocumentationDraftTokens (
    token CHAR(64) PRIMARY KEY NOT NULL,
    draftId CHAR(36) NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    usedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draftId) REFERENCES clientDocumentationDrafts(id)
        ON DELETE CASCADE
);
