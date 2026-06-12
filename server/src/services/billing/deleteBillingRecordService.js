import fs from 'fs/promises';
import path from 'path';

import { UPLOADS_DIR } from '../../../env.js';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteBillingRecordService = async ({ billingRecordId, user }) => {
    if (user.role !== 'sudo') {
        generateErrorUtil('Solo sudo puede borrar registros de facturacion', 403);
    }

    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT invoiceFilePath
        FROM billingRecords
        WHERE id = ?
          AND deletedAt IS NULL
        `,
        [billingRecordId]
    );

    if (!rows.length) {
        generateErrorUtil('Registro de facturacion no encontrado', 404);
    }

    const invoiceFilePath = rows[0].invoiceFilePath;
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

    if (invoiceFilePath) {
        const uploadsRoot = path.resolve(process.cwd(), UPLOADS_DIR);
        const filePath = path.resolve(uploadsRoot, invoiceFilePath);

        if (filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
            await fs.unlink(filePath).catch((error) => {
                if (error.code !== 'ENOENT') throw error;
            });
        }
    }

    return { id: billingRecordId };
};

export default deleteBillingRecordService;
