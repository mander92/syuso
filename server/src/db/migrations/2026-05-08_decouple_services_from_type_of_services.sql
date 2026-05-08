-- Migra services para que no dependa de typeOfServices.
-- Ejecutar con la base seleccionada: USE syuso;

ALTER TABLE services
    ADD COLUMN type VARCHAR(255) NULL AFTER name,
    ADD COLUMN description VARCHAR(250) NULL AFTER type,
    ADD COLUMN province VARCHAR(30) NULL AFTER description,
    ADD COLUMN image CHAR(40) NULL AFTER province;

UPDATE services s
LEFT JOIN typeOfServices t ON t.id = s.typeOfServicesId
SET
    s.type = COALESCE(s.type, t.type, s.name, 'Servicio'),
    s.description = COALESCE(s.description, t.description, s.comments),
    s.province = COALESCE(s.province, t.city),
    s.image = COALESCE(s.image, t.image);

SET @fk_name := (
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'typeOfServicesId'
      AND REFERENCED_TABLE_NAME = 'typeOfServices'
    LIMIT 1
);

SET @drop_fk_sql := IF(
    @fk_name IS NULL,
    'SELECT "services.typeOfServicesId no tiene foreign key" AS info',
    CONCAT('ALTER TABLE services DROP FOREIGN KEY `', @fk_name, '`')
);

PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

ALTER TABLE services
    MODIFY COLUMN typeOfServicesId CHAR(36) NULL;
