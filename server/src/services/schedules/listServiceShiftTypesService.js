import getPool from '../../db/getPool.js';

const listServiceShiftTypesService = async (serviceId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, serviceId, name, color
        FROM serviceShiftTypes
        WHERE serviceId = ?
        ORDER BY name ASC
        `,
        [serviceId]
    );

    return rows;
};

export default listServiceShiftTypesService;
