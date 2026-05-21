CREATE TABLE IF NOT EXISTS employeeDocumentationDraftTokens (
    token CHAR(64) PRIMARY KEY NOT NULL,
    draftId CHAR(36) NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    usedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draftId) REFERENCES employeeDocumentationDrafts(id)
        ON DELETE CASCADE
);
