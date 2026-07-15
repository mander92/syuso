CREATE TABLE IF NOT EXISTS serviceScheduleSnapshots (
    id CHAR(36) PRIMARY KEY NOT NULL,
    serviceId CHAR(36) NOT NULL,
    month CHAR(7) NOT NULL,
    serviceName VARCHAR(255),
    serviceType VARCHAR(255),
    delegation VARCHAR(100),
    shiftCount INT UNSIGNED NOT NULL DEFAULT 0,
    totalHours DECIMAL(10,2) NOT NULL DEFAULT 0,
    payload JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    UNIQUE KEY uniq_service_schedule_snapshot (serviceId, month),
    INDEX idx_service_schedule_snapshot_month (month),
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

INSERT INTO serviceScheduleSnapshots (
    id,
    serviceId,
    month,
    serviceName,
    serviceType,
    delegation,
    shiftCount,
    totalHours,
    payload
)
SELECT
    UUID(),
    grouped.serviceId,
    grouped.month,
    grouped.serviceName,
    grouped.serviceType,
    grouped.delegation,
    grouped.shiftCount,
    grouped.totalHours,
    grouped.payload
FROM (
    SELECT
        ss.serviceId,
        DATE_FORMAT(ss.scheduleDate, '%Y-%m') AS month,
        s.name AS serviceName,
        s.type AS serviceType,
        COALESCE(s.province, a.city, '') AS delegation,
        COUNT(*) AS shiftCount,
        COALESCE(SUM(ss.hours), 0) AS totalHours,
        JSON_OBJECT(
            'service',
            JSON_OBJECT(
                'id', s.id,
                'name', s.name,
                'type', s.type,
                'province', s.province,
                'city', a.city,
                'address', a.address
            ),
            'shifts',
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', ss.id,
                    'serviceId', ss.serviceId,
                    'employeeId', ss.employeeId,
                    'shiftTypeId', ss.shiftTypeId,
                    'scheduleDate', DATE_FORMAT(ss.scheduleDate, '%Y-%m-%d'),
                    'startTime', TIME_FORMAT(ss.startTime, '%H:%i:%s'),
                    'endTime', TIME_FORMAT(ss.endTime, '%H:%i:%s'),
                    'hours', ss.hours,
                    'realHours', ss.realHours,
                    'nightHours', ss.nightHours,
                    'holidayHours', ss.holidayHours,
                    'regularHours', ss.regularHours,
                    'status', ss.status,
                    'firstName', u.firstName,
                    'lastName', u.lastName,
                    'shiftTypeName', st.name,
                    'shiftTypeColor', st.color
                )
            )
        ) AS payload
    FROM serviceScheduleShifts ss
    INNER JOIN services s ON s.id = ss.serviceId
    LEFT JOIN addresses a ON a.id = s.addressId
    LEFT JOIN users u ON u.id = ss.employeeId
    LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
    WHERE ss.deletedAt IS NULL
    GROUP BY ss.serviceId, DATE_FORMAT(ss.scheduleDate, '%Y-%m')
) grouped
ON DUPLICATE KEY UPDATE
    serviceName = VALUES(serviceName),
    serviceType = VALUES(serviceType),
    delegation = VALUES(delegation),
    shiftCount = VALUES(shiftCount),
    totalHours = VALUES(totalHours),
    payload = VALUES(payload),
    deletedAt = NULL;
