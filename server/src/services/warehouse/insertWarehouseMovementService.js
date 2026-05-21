import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

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
    const normalizedItemName = itemName.trim();
    const normalizedCategory = emptyToNull(category);
    const normalizedSize = emptyToNull(size);
    const normalizedQuantity = Number(quantity);

    if (movementType === 'out') {
        const [stockRows] = await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN movementType = 'in' THEN quantity
                            ELSE -quantity
                        END
                    ),
                    0
                ) AS stock
            FROM warehouseMovements
            WHERE
                deletedAt IS NULL
                AND itemName = ?
                AND COALESCE(category, '') = ?
                AND COALESCE(size, '') = ?
            `,
            [
                normalizedItemName,
                normalizedCategory || '',
                normalizedSize || '',
            ]
        );

        const availableStock = Number(stockRows[0]?.stock || 0);

        if (availableStock < normalizedQuantity) {
            generateErrorUtil(
                `No hay stock suficiente. Disponible: ${availableStock}`,
                409
            );
        }
    }

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
            normalizedItemName,
            normalizedCategory,
            normalizedSize,
            normalizedQuantity,
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
