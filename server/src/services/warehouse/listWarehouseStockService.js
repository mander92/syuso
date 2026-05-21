import getPool from '../../db/getPool.js';

const listWarehouseStockService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            itemName,
            COALESCE(category, '') AS category,
            COALESCE(size, '') AS size,
            SUM(CASE WHEN movementType = 'in' THEN quantity ELSE -quantity END) AS stock,
            SUM(CASE WHEN movementType = 'in' THEN quantity * COALESCE(unitPrice, 0) ELSE 0 END) AS invested
        FROM warehouseMovements
        WHERE deletedAt IS NULL
        GROUP BY itemName, category, size
        HAVING stock > 0
        ORDER BY itemName ASC, category ASC, size ASC
        `
    );

    return rows;
};

export default listWarehouseStockService;
