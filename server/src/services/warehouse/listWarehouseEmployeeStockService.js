import getPool from '../../db/getPool.js';

const listWarehouseEmployeeStockService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            wm.employeeId,
            CONCAT_WS(' ', u.firstName, u.lastName) AS employeeName,
            wm.itemName,
            COALESCE(wm.category, '') AS category,
            COALESCE(wm.size, '') AS size,
            SUM(wm.quantity) AS quantity
        FROM warehouseMovements wm
        INNER JOIN users u ON u.id = wm.employeeId
        WHERE
            wm.deletedAt IS NULL
            AND wm.movementType = 'out'
            AND wm.employeeId IS NOT NULL
        GROUP BY wm.employeeId, employeeName, wm.itemName, category, size
        HAVING quantity > 0
        ORDER BY employeeName ASC, wm.itemName ASC, category ASC, size ASC
        `
    );

    return rows;
};

export default listWarehouseEmployeeStockService;
