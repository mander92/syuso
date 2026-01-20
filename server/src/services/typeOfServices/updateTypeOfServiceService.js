import getPool from '../../db/getPool.js';

const updateTypeOfServiceService = async (
    imgName,
    typeOfServiceId,
    description,
    type,
    city
) => {
    const pool = await getPool();

    if (!imgName) {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ?, type = ?, city = ? WHERE id = ?
        `,
            [description, type, city, typeOfServiceId]
        );
    } else {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ?, type = ?, city = ?, image = ? WHERE id = ?
        `,
            [description, type, city, imgName, typeOfServiceId]
        );
    }

};

export default updateTypeOfServiceService;
