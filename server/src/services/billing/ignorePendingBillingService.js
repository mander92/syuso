import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ignorePendingBillingService = async ({
    serviceId,
    periodStart,
    periodEnd,
    reason,
    ignoredBy,
}) => {
    if (!serviceId || !periodStart || !periodEnd) {
        generateErrorUtil('Faltan datos para quitar el pendiente de facturar', 400);
    }

    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
        INSERT INTO billingIgnoredPeriods (
            id,
            serviceId,
            periodStart,
            periodEnd,
            reason,
            ignoredBy
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, serviceId, periodStart, periodEnd, reason || null, ignoredBy]
    );

    return { id };
};

export default ignorePendingBillingService;
