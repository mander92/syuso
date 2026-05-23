ALTER TABLE employeeSignatureDocuments
    ADD COLUMN dueDate DATE NULL AFTER originalFileName,
    ADD COLUMN periodMonth CHAR(7) NULL AFTER dueDate;
