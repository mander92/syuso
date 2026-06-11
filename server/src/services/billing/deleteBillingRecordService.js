import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteBillingRecordService = async ({ billingRecordId, user }) => {
    if (user.role !== 'sudo') {
        generateErrorUtil('Solo sudo puede borrar registros de facturacion', 403);
    }

    const pool = await getPool();
    const [result] = await pool.query(
        `
        UPDATE billingRecords
        SET deletedAt = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deletedAt IS NULL
        `,
        [billingRecordId]
    );

    if (!result.affectedRows) {
        generateErrorUtil('Registro de facturacion no encontrado', 404);
    }

    return { id: billingRecordId };
};

export default deleteBillingRecordService;
