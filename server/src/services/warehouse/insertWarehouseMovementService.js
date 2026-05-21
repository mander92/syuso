import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

const emptyToNull = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
};

const insertWarehouseMovementService = async ({
    movementType,
    itemName,
    category,
    size,
    quantity,
    unitPrice,
    movementDate,
    employeeId,
    recipientName,
    notes,
    createdBy,
}) => {
    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
        INSERT INTO warehouseMovements (
            id,
            movementType,
            itemName,
            category,
            size,
            quantity,
            unitPrice,
            movementDate,
            employeeId,
            recipientName,
            notes,
            createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            movementType,
            itemName.trim(),
            emptyToNull(category),
            emptyToNull(size),
            Number(quantity),
            unitPrice === null || unitPrice === undefined || unitPrice === ''
                ? null
                : Number(unitPrice),
            movementDate,
            emptyToNull(employeeId),
            emptyToNull(recipientName),
            emptyToNull(notes),
            createdBy,
        ]
    );

    return id;
};

export default insertWarehouseMovementService;
