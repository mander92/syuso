import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

import getPool from './getPool.js';

import {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    SUDO_EMAIL,
    SUDO_PASSWORD,
} from '../../env.js';

const initDb = async () => {

    try {
        const pool = await getPool();

        console.log('Borrando tablas...');

        await pool.query(
            `
            DROP TABLE IF EXISTS adminDelegations, delegations, shiftRecords, services, typeOfServices, users, addresses, personsAssigned
            `
        );

        console.log('Creando tablas...');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS addresses (
                id CHAR(36) PRIMARY KEY NOT NULL,
                address VARCHAR(255) NOT NULL,
                postCode CHAR(5) NOT NULL,
                city VARCHAR(40) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deletedAt TIMESTAMP )
            `
        );

        console.log('Address creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS users (
                id CHAR(36) PRIMARY KEY NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                firstName VARCHAR(25),
                lastName VARCHAR(50),
                dni CHAR(11) UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(15),
                city VARCHAR(25),
                role ENUM('sudo', 'admin', 'employee', 'client') DEFAULT 'client',
                job VARCHAR(20),
                avatar CHAR(40),
                active BOOLEAN DEFAULT false,
                registrationCode CHAR(30),
                recoverPasswordCode CHAR(10),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
                modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deletedAt TIMESTAMP )
            `
        );

        console.log('users creada');


        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS typeOfServices (
                id CHAR(36) PRIMARY KEY NOT NULL,
                type VARCHAR(255) NOT NULL,
                description VARCHAR(250) NOT NULL,
                city VARCHAR(30) NOT NULL,
                image CHAR(40),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deletedAt TIMESTAMP )
            `
        );

        console.log('typeOfServices creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS services (
                id CHAR(36) PRIMARY KEY NOT NULL,
                name VARCHAR(30) NOT NULL,
                startDateTime TIMESTAMP NOT NULL,
                endDateTime TIMESTAMP,
                hours INT UNSIGNED NOT NULL CHECK (hours BETWEEN 1 AND 8),
                numberOfPeople INT UNSIGNED NOT NULL,
                comments VARCHAR(250),
                reportEmail VARCHAR(255),
                scheduleImage VARCHAR(255),
                chatPaused BOOLEAN DEFAULT false,
                status ENUM ('accepted', 'rejected', 'pending', 'completed', 'confirmed', 'canceled') DEFAULT 'pending',
                validationCode VARCHAR(30),
                clientId CHAR(36) NOT NULL,
                addressId CHAR(36) NOT NULL,
                typeOfServicesId CHAR(36) NOT NULL,
                FOREIGN KEY (clientId) REFERENCES users(id),
                FOREIGN KEY (addressId) REFERENCES addresses(id),
                FOREIGN KEY (typeOfServicesId) REFERENCES typeOfServices(id),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deletedAt TIMESTAMP )
            `
        );

        console.log('services creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS shiftRecords(
                id CHAR(36) PRIMARY KEY NOT NULL,
                clockIn TIMESTAMP,
                clockOut TIMESTAMP,
                latitudeIn DECIMAL(10,8),
                longitudeIn DECIMAL(11,8),
                latitudeOut DECIMAL(10,8),
                longitudeOut DECIMAL(11,8),
                serviceId CHAR(36) NOT NULL,
                employeeId CHAR(36) NOT NULL,
                FOREIGN KEY (serviceId) REFERENCES services(id),
                FOREIGN KEY (employeeId) REFERENCES users(id),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modifiedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deletedAt TIMESTAMP )
            `
        );

        console.log('shiftRecord creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS personsAssigned(
                id CHAR(36) PRIMARY KEY NOT NULL,
                pin CHAR(8),
                employeeId CHAR(36) NOT NULL,
                serviceId CHAR(36) NOT NULL,
                FOREIGN KEY (employeeId) REFERENCES users(id),
                FOREIGN KEY (serviceId) REFERENCES services(id))
            `
        );

        console.log('personAssinged creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS delegations (
                id CHAR(36) PRIMARY KEY NOT NULL,
                name VARCHAR(60) UNIQUE NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `
        );

        console.log('delegations creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS adminDelegations (
                id CHAR(36) PRIMARY KEY NOT NULL,
                adminId CHAR(36) NOT NULL,
                delegationId CHAR(36) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_admin_delegation (adminId, delegationId),
                FOREIGN KEY (adminId) REFERENCES users(id),
                FOREIGN KEY (delegationId) REFERENCES delegations(id)
            )
            `
        );

        console.log('adminDelegations creada');

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS serviceChatMessages (
                id CHAR(36) PRIMARY KEY NOT NULL,
                serviceId CHAR(36) NOT NULL,
                userId CHAR(36) NOT NULL,
                message TEXT NOT NULL,
                imagePath VARCHAR(255),
                replyToMessageId CHAR(36),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (serviceId) REFERENCES services(id),
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (replyToMessageId)
                    REFERENCES serviceChatMessages(id)
                    ON DELETE SET NULL
            )
            `
        );

        console.log('serviceChatMessages creada');

        await pool.query(
            `
            CREATE TABLE consulting_requests (
            id CHAR(36) NOT NULL PRIMARY KEY,
            fullName VARCHAR(100) NOT NULL,
            company VARCHAR(150) DEFAULT NULL,
            email VARCHAR(150) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            topic VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `
        );

        console.log('consulting_requests creada');

        await pool.query(
            `
            CREATE TABLE consulting_requests (
            id CHAR(36) NOT NULL PRIMARY KEY,
            fullName VARCHAR(100) NOT NULL,
            company VARCHAR(150) DEFAULT NULL,
            email VARCHAR(150) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            topic VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `
        );

        console.log('job_application creada');

        await pool.query(
            `
            CREATE TABLE workReports (
            id CHAR(36) PRIMARY KEY NOT NULL,
            shiftRecordId CHAR(36),
            serviceId CHAR(36) NOT NULL,
            folio VARCHAR(50) NOT NULL,
            reportDate DATE NOT NULL,
            incidentStart DATETIME NOT NULL,
            incidentEnd DATETIME NOT NULL,
            location VARCHAR(255) NOT NULL,
            guardFullName VARCHAR(100) NOT NULL,
            guardEmployeeNumber VARCHAR(50) NOT NULL,
            guardShift VARCHAR(50) NOT NULL,
            securityCompany VARCHAR(100) NOT NULL,
            incidentType VARCHAR(80) NOT NULL,
            severity ENUM('leve','moderada','grave') NOT NULL,
            description TEXT NOT NULL,
            detection TEXT NOT NULL,
            actionsTaken TEXT NOT NULL,
            outcome VARCHAR(80) NOT NULL,
            signaturePath VARCHAR(255) NOT NULL,
            reportImagePath VARCHAR(255) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (serviceId) REFERENCES services(id),
            FOREIGN KEY (shiftRecordId)
                REFERENCES shiftRecords(id)
                ON DELETE SET NULL);
            `
        );

        await pool.query(
            `
            CREATE TABLE workReportDrafts (
            id CHAR(36) PRIMARY KEY NOT NULL,
            shiftRecordId CHAR(36) NOT NULL,
            serviceId CHAR(36),
            employeeId CHAR(36) NOT NULL,
            data JSON,
            signaturePath VARCHAR(255),
            photoPaths JSON,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_shift_report (shiftRecordId),
            FOREIGN KEY (shiftRecordId) REFERENCES shiftRecords(id),
            FOREIGN KEY (serviceId) REFERENCES services(id),
            FOREIGN KEY (employeeId) REFERENCES users(id));
            `
        );

        await pool.query(
            `
            CREATE TABLE workReportIncidents (
            id CHAR(36) PRIMARY KEY NOT NULL,
            workReportId CHAR(36) NOT NULL,
            description TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workReportId) REFERENCES workReports(id));
            `
        );

        await pool.query(
            `
            CREATE TABLE workReportPhotos (
            id CHAR(36) PRIMARY KEY NOT NULL,
            workReportId CHAR(36) NOT NULL,
            photoPath VARCHAR(255) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workReportId) REFERENCES workReports(id));
            `
        );

        await pool.query(
            `
            CREATE TABLE workReportIncidentPhotos (
            id CHAR(36) PRIMARY KEY NOT NULL,
            workReportIncidentId CHAR(36) NOT NULL,
            photoPath VARCHAR(255) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workReportIncidentId) REFERENCES workReportIncidents(id));
            `
        );

        const hashedPass = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const sudoPassword = SUDO_PASSWORD || ADMIN_PASSWORD;
        const sudoEmail = SUDO_EMAIL || ADMIN_EMAIL;

        if (sudoEmail) {
            const sudoHashed = await bcrypt.hash(sudoPassword, 10);
            await pool.query(
                `
                INSERT INTO users (id, email, password, role, active) VALUES (?, ?, ?, ?, ?)
                `,
                [uuid(), sudoEmail, sudoHashed, 'sudo', 1]
            );
        }

        if (ADMIN_EMAIL && ADMIN_EMAIL !== sudoEmail) {
            await pool.query(
                `
                INSERT INTO users (id, email, password, role, active) VALUES (?, ?, ?, ?, ?)
                `,
                [uuid(), ADMIN_EMAIL, hashedPass, 'admin', 1]
            );
        }

        console.log('¡Tablas creadas!');

        console.log('¡Servicios básicos creados!');

        console.log('¡ADMIN creado!');
    } catch (err) {
        console.error('Error creando las tablas', err.message, err);
    } finally {
        process.exit();
    }
};

initDb();
