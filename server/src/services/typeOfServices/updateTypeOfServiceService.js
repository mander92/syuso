import getPool from '../../db/getPool.js';

const updateTypeOfServiceService = async (
    imgName,
    typeOfServiceId,
    description,
    price
) => {
    const pool = await getPool();

    if (!imgName) {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ?, price = ? WHERE id = ?
        `,
            [description, price, typeOfServiceId]
        );
    } else {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ?, price = ?, image = ? WHERE id = ?
        `,
            [description, price, imgName, typeOfServiceId]
        );
    }

};

export default updateTypeOfServiceService;
