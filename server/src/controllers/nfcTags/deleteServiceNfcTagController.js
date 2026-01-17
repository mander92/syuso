import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteServiceNfcTagController = async (req, res, next) => {
    try {
        const { serviceId, tagId } = req.params;
        const pool = await getPool();

        const [result] = await pool.query(
            `
            DELETE FROM serviceNfcTags
            WHERE id = ? AND serviceId = ?
            `,
            [tagId, serviceId]
        );

        if (!result.affectedRows) {
            generateErrorUtil('Tag no encontrado', 404);
        }

        res.send({ status: 'ok' });
    } catch (error) {
        next(error);
    }
};

export default deleteServiceNfcTagController;
