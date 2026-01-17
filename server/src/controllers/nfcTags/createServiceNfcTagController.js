import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createServiceNfcTagController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { tagUid, tagName } = req.body;

        if (!tagUid || !tagName) {
            generateErrorUtil('Debes indicar tag y nombre', 400);
        }

        const pool = await getPool();
        const [existing] = await pool.query(
            `
            SELECT id FROM serviceNfcTags
            WHERE serviceId = ? AND tagUid = ?
            `,
            [serviceId, tagUid]
        );

        if (existing.length) {
            generateErrorUtil('El tag ya esta asociado', 409);
        }

        const id = uuid();
        await pool.query(
            `
            INSERT INTO serviceNfcTags (id, serviceId, tagUid, tagName, createdBy)
            VALUES (?, ?, ?, ?, ?)
            `,
            [id, serviceId, tagUid, tagName, req.userLogged.id]
        );

        res.send({
            status: 'ok',
            data: { id, tagUid, tagName },
        });
    } catch (error) {
        next(error);
    }
};

export default createServiceNfcTagController;
