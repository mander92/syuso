import getPool from '../../db/getPool.js';

const updateTypeOfServiceService = async (
    imgName,
    typeOfServiceId,
    description
) => {
    const pool = await getPool();

    if (!imgName) {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ? WHERE id = ?
        `,
            [description, typeOfServiceId]
        );
    } else {
        await pool.query(
            `
        UPDATE typeOfServices SET description = ?, image = ? WHERE id = ?
        `,
            [description, imgName, typeOfServiceId]
        );
    }

};

export default updateTypeOfServiceService;
