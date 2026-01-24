import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateServiceShiftTypeService = async (
    serviceId,
    shiftTypeId,
    updates
) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, name, color
        FROM serviceShiftTypes
        WHERE id = ? AND serviceId = ?
        `,
        [shiftTypeId, serviceId]
    );

    if (!rows.length) {
        generateErrorUtil('Tipo de turno no encontrado', 404);
    }

    const current = rows[0];
    const resolvedName = updates.name ?? current.name;
    const resolvedColor = updates.color ?? current.color;

    await pool.query(
        `
        UPDATE serviceShiftTypes
        SET name = ?, color = ?
        WHERE id = ? AND serviceId = ?
        `,
        [resolvedName, resolvedColor, shiftTypeId, serviceId]
    );

    return {
        id: shiftTypeId,
        serviceId,
        name: resolvedName,
        color: resolvedColor,
    };
};

export default updateServiceShiftTypeService;
