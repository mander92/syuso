import getPool from '../../db/getPool.js';

const listWarehouseMovementsService = async ({
    movementType,
    itemName,
    employeeId,
    fromDate,
    toDate,
} = {}) => {
    const pool = await getPool();
    const filters = ['wm.deletedAt IS NULL'];
    const values = [];

    if (movementType) {
        filters.push('wm.movementType = ?');
        values.push(movementType);
    }

    if (itemName) {
        filters.push('wm.itemName LIKE ?');
        values.push(`%${itemName}%`);
    }

    if (employeeId) {
        filters.push('wm.employeeId = ?');
        values.push(employeeId);
    }

    if (fromDate) {
        filters.push('wm.movementDate >= ?');
        values.push(fromDate);
    }

    if (toDate) {
        filters.push('wm.movementDate <= ?');
        values.push(toDate);
    }

    const [rows] = await pool.query(
        `
        SELECT
            wm.id,
            wm.movementType,
            wm.itemName,
            wm.category,
            wm.size,
            wm.quantity,
            wm.unitPrice,
            wm.movementDate,
            wm.employeeId,
            wm.recipientName,
            wm.notes,
            wm.createdAt,
            CONCAT_WS(' ', employee.firstName, employee.lastName) AS employeeName,
            CONCAT_WS(' ', creator.firstName, creator.lastName) AS createdByName
        FROM warehouseMovements wm
        LEFT JOIN users employee ON employee.id = wm.employeeId
        LEFT JOIN users creator ON creator.id = wm.createdBy
        WHERE ${filters.join(' AND ')}
        ORDER BY wm.movementDate DESC, wm.createdAt DESC
        LIMIT 500
        `,
        values
    );

    return rows;
};

export default listWarehouseMovementsService;
