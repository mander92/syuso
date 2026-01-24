import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';

const createServiceShiftTypeService = async (
    serviceId,
    name,
    color,
    createdBy
) => {
    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
        INSERT INTO serviceShiftTypes
            (id, serviceId, name, color, createdBy)
        VALUES (?, ?, ?, ?, ?)
        `,
        [id, serviceId, name, color, createdBy || null]
    );

    return {
        id,
        serviceId,
        name,
        color,
    };
};

export default createServiceShiftTypeService;
