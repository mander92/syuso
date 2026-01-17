import getPool from '../../db/getPool.js';

const listServiceNfcTagsController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const pool = await getPool();

        const [rows] = await pool.query(
            `
            SELECT id, tagUid, tagName, createdAt
            FROM serviceNfcTags
            WHERE serviceId = ?
            ORDER BY createdAt DESC
            `,
            [serviceId]
        );

        res.send({ status: 'ok', data: rows });
    } catch (error) {
        next(error);
    }
};

export default listServiceNfcTagsController;
