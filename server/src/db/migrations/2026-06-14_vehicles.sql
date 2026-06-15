CREATE TABLE IF NOT EXISTS vehicles (
    id CHAR(36) PRIMARY KEY NOT NULL,
    name VARCHAR(120) NOT NULL,
    plate VARCHAR(30) NOT NULL,
    ownershipType ENUM('own','renting') NOT NULL DEFAULT 'own',
    fuelType ENUM('gasoline','diesel','hybrid','electric','other') NOT NULL DEFAULT 'diesel',
    brand VARCHAR(80),
    model VARCHAR(80),
    vehicleYear SMALLINT UNSIGNED,
    vin VARCHAR(80),
    customerServicePhone VARCHAR(40),
    insuranceCompany VARCHAR(120),
    insurancePolicy VARCHAR(120),
    insuranceExpiryDate DATE,
    itvExpiryDate DATE,
    documentationNotes TEXT,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    UNIQUE KEY unique_vehicle_plate_active (plate, deletedAt),
    INDEX idx_vehicles_active (active, deletedAt)
);

CREATE TABLE IF NOT EXISTS serviceVehicles (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36) NOT NULL,
    vehicleId CHAR(36) NOT NULL,
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignedBy CHAR(36),
    deletedAt TIMESTAMP NULL,
    UNIQUE KEY unique_service_vehicle_active (serviceId, vehicleId, deletedAt),
    INDEX idx_service_vehicles_service (serviceId, deletedAt),
    INDEX idx_service_vehicles_vehicle (vehicleId, deletedAt),
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicleFuelLogs (
    id CHAR(36) PRIMARY KEY NOT NULL,
    vehicleId CHAR(36) NOT NULL,
    serviceId CHAR(36),
    employeeId CHAR(36),
    fuelDate DATETIME NOT NULL,
    odometerKm INT UNSIGNED,
    liters DECIMAL(10,2),
    amount DECIMAL(10,2),
    ticketPath VARCHAR(255),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_vehicle_fuel_vehicle_date (vehicleId, fuelDate),
    INDEX idx_vehicle_fuel_service (serviceId),
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicleInspections (
    id CHAR(36) PRIMARY KEY NOT NULL,
    vehicleId CHAR(36) NOT NULL,
    serviceId CHAR(36) NOT NULL,
    employeeId CHAR(36) NOT NULL,
    inspectionDate DATETIME NOT NULL,
    odometerKm INT UNSIGNED,
    fuelLevel VARCHAR(30),
    cleanliness VARCHAR(30),
    checklist JSON,
    damageNotes TEXT,
    photoPaths JSON,
    ticketPaths JSON,
    fuelLiters DECIMAL(10,2),
    fuelAmount DECIMAL(10,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    INDEX idx_vehicle_inspections_vehicle_date (vehicleId, inspectionDate),
    INDEX idx_vehicle_inspections_service (serviceId),
    INDEX idx_vehicle_inspections_employee (employeeId),
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (employeeId) REFERENCES users(id) ON DELETE CASCADE
);

SET @has_vehicle_customer_service_phone = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vehicles'
      AND COLUMN_NAME = 'customerServicePhone'
);

SET @sql = IF(
    @has_vehicle_customer_service_phone = 0,
    'ALTER TABLE vehicles ADD COLUMN customerServicePhone VARCHAR(40) NULL AFTER vin',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
