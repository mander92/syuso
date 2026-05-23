ALTER TABLE employeeSignatureDocuments
    ADD COLUMN signedFileName VARCHAR(255) NULL AFTER signaturePath,
    ADD COLUMN validatedAt TIMESTAMP NULL AFTER signedAt,
    ADD COLUMN validatedBy CHAR(36) NULL AFTER validatedAt;

ALTER TABLE employeeSignatureDocuments
    MODIFY status ENUM('pending','signed','submitted','validated') NOT NULL DEFAULT 'pending';

UPDATE employeeSignatureDocuments
SET status = 'validated',
    validatedAt = COALESCE(signedAt, modifiedAt, createdAt)
WHERE status = 'signed';

ALTER TABLE employeeSignatureDocuments
    MODIFY status ENUM('pending','submitted','validated') NOT NULL DEFAULT 'pending';

ALTER TABLE employeeSignatureDocuments
    ADD CONSTRAINT fk_employee_signature_validated_by
        FOREIGN KEY (validatedBy) REFERENCES users(id);
