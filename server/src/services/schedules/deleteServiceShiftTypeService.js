import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteServiceShiftTypeService = async (serviceId, shiftTypeId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id
        FROM serviceShiftTypes
        WHERE id = ? AND serviceId = ?
        `,
        [shiftTypeId, serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Tipo de turno no encontrado', 404);
    }

    await pool.query(
        `
        DELETE FROM serviceShiftTypes
        WHERE id = ? AND serviceId = ?
        `,
        [shiftTypeId, serviceId]
    );
};

export default deleteServiceShiftTypeService;
