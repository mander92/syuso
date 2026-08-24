CREATE TABLE IF NOT EXISTS pushSubscriptions (
    id CHAR(36) PRIMARY KEY NOT NULL,
    userId CHAR(36) NOT NULL,
    endpoint TEXT NOT NULL,
    endpointHash CHAR(64) NOT NULL UNIQUE,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    deviceName VARCHAR(120),
    deviceType ENUM('ios', 'android', 'desktop', 'unknown') DEFAULT 'unknown',
    browserName VARCHAR(80),
    userAgent TEXT,
    enabled BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastUsedAt TIMESTAMP NULL,
    deletedAt TIMESTAMP NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE INDEX idx_push_subscriptions_user_enabled
    ON pushSubscriptions (userId, enabled, deletedAt);
