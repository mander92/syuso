-- Añade soporte para servicios a convenio, horas nocturnas/festivas y calendario de festivos.
-- Ejecutar con la base seleccionada: USE syuso;

ALTER TABLE services
    ADD COLUMN hourRuleType ENUM('standard', 'convenio') NOT NULL DEFAULT 'standard' AFTER scheduleView,
    ADD COLUMN autonomousCommunity VARCHAR(100) NULL AFTER province;

ALTER TABLE serviceScheduleShifts
    ADD COLUMN realHours DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER hours,
    ADD COLUMN nightHours DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER realHours,
    ADD COLUMN holidayHours DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER nightHours,
    ADD COLUMN regularHours DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER holidayHours;

UPDATE serviceScheduleShifts
SET
    realHours = COALESCE(hours, 0),
    regularHours = COALESCE(hours, 0)
WHERE realHours = 0
  AND COALESCE(hours, 0) > 0;

CREATE TABLE IF NOT EXISTS holidays (
    id CHAR(36) PRIMARY KEY NOT NULL,
    holidayDate DATE NOT NULL,
    name VARCHAR(150) NOT NULL,
    scope ENUM('national', 'autonomous', 'local') NOT NULL,
    autonomousCommunity VARCHAR(100),
    province VARCHAR(100),
    city VARCHAR(100),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP,
    UNIQUE KEY unique_holiday_scope (
        holidayDate,
        scope,
        autonomousCommunity,
        province,
        city
    ),
    INDEX idx_holidays_date_scope (holidayDate, scope),
    INDEX idx_holidays_location (autonomousCommunity, province, city)
);
