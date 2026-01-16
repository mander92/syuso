import getPool from '../../db/getPool.js';

const selectTypeOfServiceByIdService = async (typeOfServiceId) => {
    const pool = await getPool();

    const [type] = await pool.query(
        ` 
        SELECT t.id, t.image, t.type, t.description, t.city
        FROM 
        typeOfServices t
        WHERE 
        t.deletedAt IS NULL AND t.id = ?
        `,
        [typeOfServiceId]
    );

    return type[0];
};

export default selectTypeOfServiceByIdService;
