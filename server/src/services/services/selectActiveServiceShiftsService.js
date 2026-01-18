import getPool from '../../db/getPool.js';

const selectActiveServiceShiftsService = async (serviceId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            sr.id AS shiftId,
            sr.clockIn,
            sr.employeeId,
            u.firstName,
            u.lastName,
            u.email,
            u.phone
        FROM shiftRecords sr
        INNER JOIN users u ON u.id = sr.employeeId
        WHERE sr.serviceId = ?
        AND sr.clockOut IS NULL
        AND sr.deletedAt IS NULL
        ORDER BY sr.clockIn DESC
        `,
        [serviceId]
    );

    return rows;
};

export default selectActiveServiceShiftsService;
