ALTER TABLE salaryServiceRates
    MODIFY payMode ENUM('hourly','fixed','agreement') NOT NULL DEFAULT 'hourly';
