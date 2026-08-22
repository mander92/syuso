import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';

export const listServiceScheduleEmployeeOrderService = async (serviceId) => {
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT employeeId, position
        FROM serviceScheduleEmployeeOrders
        WHERE serviceId = ?
        ORDER BY position ASC
        `,
        [serviceId]
    );

    return rows;
};

export const replaceServiceScheduleEmployeeOrderService = async (
    serviceId,
    employeeIds = []
) => {
    const pool = await getPool();
    const orderedIds = [...new Set(employeeIds.filter(Boolean))];

    await pool.query(
        'DELETE FROM serviceScheduleEmployeeOrders WHERE serviceId = ?',
        [serviceId]
    );

    for (let index = 0; index < orderedIds.length; index += 1) {
        await pool.query(
            `
            INSERT INTO serviceScheduleEmployeeOrders (
                id,
                serviceId,
                employeeId,
                position
            )
            VALUES (?, ?, ?, ?)
            `,
            [uuid(), serviceId, orderedIds[index], index]
        );
    }

    return listServiceScheduleEmployeeOrderService(serviceId);
};
