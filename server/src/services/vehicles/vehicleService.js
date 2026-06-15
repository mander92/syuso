import fsPromises from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { UPLOADS_DIR } from '../../../env.js';
import ensureServiceDelegationAccessService from '../delegations/ensureServiceDelegationAccessService.js';

const ensureDir = async (dirPath) => {
    try {
        await fsPromises.access(dirPath);
    } catch {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
};

const toArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const saveUploadedFiles = async (files, folder) => {
    const fileList = toArray(files).filter(Boolean);
    if (!fileList.length) return [];

    const uploadDir = path.join(process.cwd(), UPLOADS_DIR, 'vehicles', folder);
    await ensureDir(uploadDir);

    const paths = [];
    for (const file of fileList) {
        const extension = path.extname(file.name || '').toLowerCase() || '.jpg';
        const fileName = `${uuid()}${extension}`;
        const diskPath = path.join(uploadDir, fileName);

        if (file.tempFilePath) {
            await fsPromises.copyFile(file.tempFilePath, diskPath);
        } else if (file.data) {
            await fsPromises.writeFile(diskPath, file.data);
        }

        paths.push(`vehicles/${folder}/${fileName}`);
    }

    return paths;
};

export const listVehiclesService = async ({ search = '', active = '' } = {}) => {
    const pool = await getPool();
    const filters = ['v.deletedAt IS NULL'];
    const values = [];

    if (search) {
        filters.push('(v.name LIKE ? OR v.plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (active !== '') {
        filters.push('v.active = ?');
        values.push(active === '1' || active === 'true' ? 1 : 0);
    }

    const [rows] = await pool.query(
        `
        SELECT
            v.*,
            COALESCE(
                JSON_ARRAYAGG(
                    CASE
                        WHEN sv.serviceId IS NULL THEN NULL
                        ELSE JSON_OBJECT(
                            'serviceId', sv.serviceId,
                            'serviceName', s.name,
                            'province', s.province
                        )
                    END
                ),
                JSON_ARRAY()
            ) AS services
        FROM vehicles v
        LEFT JOIN serviceVehicles sv
            ON sv.vehicleId = v.id AND sv.deletedAt IS NULL
        LEFT JOIN services s
            ON s.id = sv.serviceId AND s.deletedAt IS NULL
        WHERE ${filters.join(' AND ')}
        GROUP BY v.id
        ORDER BY v.name ASC, v.plate ASC
        `,
        values
    );

    return rows.map((row) => ({
        ...row,
        services: Array.isArray(row.services)
            ? row.services.filter(Boolean)
            : JSON.parse(row.services || '[]').filter(Boolean),
    }));
};

export const upsertVehicleService = async ({ vehicleId = '', payload }) => {
    const pool = await getPool();
    const id = vehicleId || uuid();
    const values = [
        payload.name,
        payload.plate,
        payload.ownershipType || 'own',
        payload.fuelType || 'diesel',
        payload.brand || null,
        payload.model || null,
        payload.vehicleYear || null,
        payload.vin || null,
        payload.customerServicePhone || null,
        payload.insuranceCompany || null,
        payload.insurancePolicy || null,
        payload.insuranceExpiryDate || null,
        payload.itvExpiryDate || null,
        payload.documentationNotes || null,
        payload.active === false ? 0 : 1,
    ];

    if (!payload.name || !payload.plate) {
        generateErrorUtil('Nombre y matricula son obligatorios', 400);
    }

    if (vehicleId) {
        const [existing] = await pool.query(
            'SELECT id FROM vehicles WHERE id = ? AND deletedAt IS NULL',
            [vehicleId]
        );
        if (!existing.length) generateErrorUtil('Vehiculo no encontrado', 404);

        await pool.query(
            `
            UPDATE vehicles
            SET name = ?, plate = ?, ownershipType = ?, fuelType = ?,
                brand = ?, model = ?, vehicleYear = ?, vin = ?,
                customerServicePhone = ?, insuranceCompany = ?, insurancePolicy = ?,
                insuranceExpiryDate = ?, itvExpiryDate = ?,
                documentationNotes = ?, active = ?
            WHERE id = ?
            `,
            [...values, vehicleId]
        );
        return { id: vehicleId };
    }

    await pool.query(
        `
        INSERT INTO vehicles (
            id, name, plate, ownershipType, fuelType, brand, model,
            vehicleYear, vin, customerServicePhone, insuranceCompany, insurancePolicy,
            insuranceExpiryDate, itvExpiryDate, documentationNotes, active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, ...values]
    );

    return { id };
};

export const deleteVehicleService = async (vehicleId) => {
    const pool = await getPool();
    await pool.query('UPDATE vehicles SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [
        vehicleId,
    ]);
    await pool.query(
        'UPDATE serviceVehicles SET deletedAt = CURRENT_TIMESTAMP WHERE vehicleId = ? AND deletedAt IS NULL',
        [vehicleId]
    );
    return { id: vehicleId };
};

export const assignVehiclesToServiceService = async ({
    serviceId,
    vehicleIds = [],
    userId,
    role,
}) => {
    await ensureServiceDelegationAccessService(serviceId, userId, role);
    const pool = await getPool();
    const ids = [...new Set(vehicleIds.filter(Boolean))];

    await pool.query(
        'UPDATE serviceVehicles SET deletedAt = CURRENT_TIMESTAMP WHERE serviceId = ? AND deletedAt IS NULL',
        [serviceId]
    );

    for (const vehicleId of ids) {
        const [vehicles] = await pool.query(
            'SELECT id FROM vehicles WHERE id = ? AND deletedAt IS NULL AND active = 1',
            [vehicleId]
        );
        if (!vehicles.length) continue;
        await pool.query(
            `
            INSERT INTO serviceVehicles (id, serviceId, vehicleId, assignedBy)
            VALUES (?, ?, ?, ?)
            `,
            [uuid(), serviceId, vehicleId, userId]
        );
    }

    return listServiceVehiclesService({ serviceId, userId, role });
};

export const ensureEmployeeServiceVehicleAccess = async ({
    serviceId,
    vehicleId,
    userId,
    role,
}) => {
    if (role === 'admin' || role === 'sudo') {
        await ensureServiceDelegationAccessService(serviceId, userId, role);
        return true;
    }

    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT sv.id
        FROM serviceVehicles sv
        INNER JOIN personsAssigned pa
            ON pa.serviceId = sv.serviceId AND pa.employeeId = ?
        WHERE sv.serviceId = ?
          AND sv.vehicleId = ?
          AND sv.deletedAt IS NULL
        LIMIT 1
        `,
        [userId, serviceId, vehicleId]
    );

    if (!rows.length) generateErrorUtil('Acceso denegado', 403);
    return true;
};

export const listServiceVehiclesService = async ({ serviceId, userId, role }) => {
    const pool = await getPool();

    if (role === 'admin' || role === 'sudo') {
        await ensureServiceDelegationAccessService(serviceId, userId, role);
    } else {
        const [assigned] = await pool.query(
            'SELECT id FROM personsAssigned WHERE serviceId = ? AND employeeId = ? LIMIT 1',
            [serviceId, userId]
        );
        if (!assigned.length) generateErrorUtil('Acceso denegado', 403);
    }

    const [rows] = await pool.query(
        `
        SELECT v.*
        FROM serviceVehicles sv
        INNER JOIN vehicles v ON v.id = sv.vehicleId
        WHERE sv.serviceId = ?
          AND sv.deletedAt IS NULL
          AND v.deletedAt IS NULL
          AND v.active = 1
        ORDER BY v.name ASC, v.plate ASC
        `,
        [serviceId]
    );

    return rows;
};

export const getVehicleInspectionStatusService = async ({
    serviceId,
    shiftRecordId,
    userId,
    role,
}) => {
    const pool = await getPool();
    const vehicles = await listServiceVehiclesService({
        serviceId,
        userId,
        role,
    });

    if (!vehicles.length) {
        return {
            required: false,
            completed: true,
            vehicles,
        };
    }

    if (!shiftRecordId) {
        return {
            required: true,
            completed: false,
            vehicles,
        };
    }

    const [shiftRows] = await pool.query(
        `
        SELECT id, serviceId, employeeId, clockIn, realClockIn
        FROM shiftRecords
        WHERE id = ?
        LIMIT 1
        `,
        [shiftRecordId]
    );

    if (!shiftRows.length) generateErrorUtil('Turno no encontrado', 404);

    const shift = shiftRows[0];
    if (shift.serviceId !== serviceId || shift.employeeId !== userId) {
        generateErrorUtil('Turno invalido', 403);
    }

    const since = shift.realClockIn || shift.clockIn || null;
    const [inspectionRows] = await pool.query(
        `
        SELECT id, inspectionDate
        FROM vehicleInspections
        WHERE serviceId = ?
          AND employeeId = ?
          AND deletedAt IS NULL
          AND inspectionDate >= COALESCE(?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR))
        ORDER BY inspectionDate DESC
        LIMIT 1
        `,
        [serviceId, userId, since]
    );

    return {
        required: true,
        completed: inspectionRows.length > 0,
        inspectionId: inspectionRows[0]?.id || null,
        inspectionDate: inspectionRows[0]?.inspectionDate || null,
        vehicles,
    };
};

export const ensureVehicleInspectionForShiftService = async ({
    serviceId,
    shiftRecordId,
    employeeId,
}) => {
    const pool = await getPool();
    const [vehicleRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM serviceVehicles sv
        INNER JOIN vehicles v ON v.id = sv.vehicleId
        WHERE sv.serviceId = ?
          AND sv.deletedAt IS NULL
          AND v.deletedAt IS NULL
          AND v.active = 1
        `,
        [serviceId]
    );

    if (Number(vehicleRows[0]?.total || 0) === 0) return true;

    const [shiftRows] = await pool.query(
        `
        SELECT id, clockIn, realClockIn
        FROM shiftRecords
        WHERE id = ?
          AND serviceId = ?
          AND employeeId = ?
        LIMIT 1
        `,
        [shiftRecordId, serviceId, employeeId]
    );

    if (!shiftRows.length) generateErrorUtil('Turno invalido', 403);

    const since = shiftRows[0].realClockIn || shiftRows[0].clockIn || null;
    const [inspectionRows] = await pool.query(
        `
        SELECT id
        FROM vehicleInspections
        WHERE serviceId = ?
          AND employeeId = ?
          AND deletedAt IS NULL
          AND inspectionDate >= COALESCE(?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR))
        LIMIT 1
        `,
        [serviceId, employeeId, since]
    );

    if (!inspectionRows.length) {
        generateErrorUtil(
            'Debes enviar el parte de inspeccion del vehiculo antes de cerrar el parte de trabajo',
            409
        );
    }

    return true;
};

export const createVehicleFuelLogService = async ({
    vehicleId,
    serviceId = null,
    employeeId = null,
    payload,
    ticketFile,
}) => {
    const pool = await getPool();
    const ticketPaths = await saveUploadedFiles(ticketFile, 'fuelTickets');
    const id = uuid();

    await pool.query(
        `
        INSERT INTO vehicleFuelLogs (
            id, vehicleId, serviceId, employeeId, fuelDate, odometerKm,
            liters, amount, ticketPath, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            vehicleId,
            serviceId || null,
            employeeId || null,
            payload.fuelDate || new Date(),
            payload.odometerKm || null,
            payload.liters || null,
            payload.amount || null,
            payload.ticketPath || ticketPaths[0] || null,
            payload.notes || null,
        ]
    );

    return { id };
};

export const createVehicleInspectionService = async ({
    serviceId,
    vehicleId,
    employeeId,
    role,
    payload,
    files = {},
}) => {
    await ensureEmployeeServiceVehicleAccess({
        serviceId,
        vehicleId,
        userId: employeeId,
        role,
    });

    const pool = await getPool();
    const photoPaths = await saveUploadedFiles(files.photos, 'inspectionPhotos');
    const ticketPaths = await saveUploadedFiles(files.tickets, 'fuelTickets');
    const checklist = payload.checklist
        ? typeof payload.checklist === 'string'
            ? JSON.parse(payload.checklist)
            : payload.checklist
        : {};
    const id = uuid();

    await pool.query(
        `
        INSERT INTO vehicleInspections (
            id, vehicleId, serviceId, employeeId, inspectionDate, odometerKm,
            fuelLevel, cleanliness, checklist, damageNotes, photoPaths,
            ticketPaths, fuelLiters, fuelAmount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            vehicleId,
            serviceId,
            employeeId,
            payload.inspectionDate || new Date(),
            payload.odometerKm || null,
            payload.fuelLevel || null,
            payload.cleanliness || null,
            JSON.stringify(checklist),
            payload.damageNotes || null,
            JSON.stringify(photoPaths),
            JSON.stringify(ticketPaths),
            payload.fuelLiters || null,
            payload.fuelAmount || null,
        ]
    );

    if (payload.fuelLiters || payload.fuelAmount || ticketPaths.length) {
        await createVehicleFuelLogService({
            vehicleId,
            serviceId,
            employeeId,
            payload: {
                fuelDate: payload.inspectionDate || new Date(),
                odometerKm: payload.odometerKm,
                liters: payload.fuelLiters,
                amount: payload.fuelAmount,
                ticketPath: ticketPaths[0] || null,
                notes: `Parte de vehiculo ${id}`,
            },
            ticketFile: null,
        });
    }

    return { id };
};

export const listVehicleLogsService = async () => {
    const pool = await getPool();
    const [fuelLogs] = await pool.query(
        `
        SELECT fl.*, v.name AS vehicleName, v.plate, s.name AS serviceName,
               CONCAT_WS(' ', u.firstName, u.lastName) AS employeeName
        FROM vehicleFuelLogs fl
        INNER JOIN vehicles v ON v.id = fl.vehicleId
        LEFT JOIN services s ON s.id = fl.serviceId
        LEFT JOIN users u ON u.id = fl.employeeId
        WHERE fl.deletedAt IS NULL
        ORDER BY fl.fuelDate DESC
        LIMIT 300
        `
    );
    const [inspections] = await pool.query(
        `
        SELECT vi.*, v.name AS vehicleName, v.plate, v.brand, v.model,
               s.name AS serviceName, s.province,
               CONCAT_WS(' ', u.firstName, u.lastName) AS employeeName,
               u.email AS employeeEmail
        FROM vehicleInspections vi
        INNER JOIN vehicles v ON v.id = vi.vehicleId
        INNER JOIN services s ON s.id = vi.serviceId
        INNER JOIN users u ON u.id = vi.employeeId
        WHERE vi.deletedAt IS NULL
        ORDER BY vi.inspectionDate DESC
        LIMIT 300
        `
    );

    return { fuelLogs, inspections };
};
