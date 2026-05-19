ALTER TABLE generalChats
    MODIFY type ENUM('standard','announcement','direct') NOT NULL DEFAULT 'standard';
