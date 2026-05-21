import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteWarehouseStockItemService = async ({ itemName, category, size }) => {
    const pool = await getPool();
    const normalizedItemName = String(itemName || '').trim();
    const normalizedCategory = String(category || '').trim();
    const normalizedSize = String(size || '').trim();

    if (!normalizedItemName) {
        generateErrorUtil('Indica la prenda a borrar', 400);
    }

    const [result] = await pool.query(
        `
        UPDATE warehouseMovements
        SET deletedAt = CURRENT_TIMESTAMP
        WHERE
            deletedAt IS NULL
            AND itemName = ?
            AND COALESCE(category, '') = ?
            AND COALESCE(size, '') = ?
        `,
        [normalizedItemName, normalizedCategory, normalizedSize]
    );

    if (!result.affectedRows) {
        generateErrorUtil('Tipo de prenda no encontrado', 404);
    }

    return result.affectedRows;
};

export default deleteWarehouseStockItemService;
