import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteWarehouseMovementService = async (movementId) => {
    const pool = await getPool();

    const [result] = await pool.query(
        `
        UPDATE warehouseMovements
        SET deletedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND deletedAt IS NULL
        `,
        [movementId]
    );

    if (!result.affectedRows) {
        generateErrorUtil('Movimiento de almacen no encontrado', 404);
    }
};

export default deleteWarehouseMovementService;
