import getPool from '../../db/getPool.js';

const selectInProgressServicesService = async (
    clientId = null,
    delegationNames = []
) => {
    const pool = await getPool();

    let sqlQuery = `
        SELECT
            s.id AS serviceId,
            s.name,
            s.status,
            s.startDateTime,
            s.endDateTime,
            s.hours,
            s.scheduleImage,
            a.address,
            a.city,
            a.postCode,
            t.type,
            sr.id AS shiftId,
            sr.clockIn,
            sr.employeeId,
            u.firstName,
            u.lastName
        FROM shiftRecords sr
        INNER JOIN services s ON s.id = sr.serviceId
        INNER JOIN addresses a ON a.id = s.addressId
        INNER JOIN typeOfServices t ON t.id = s.typeOfServicesId
        INNER JOIN users u ON u.id = sr.employeeId
        WHERE sr.clockOut IS NULL
        AND sr.deletedAt IS NULL
        AND s.deletedAt IS NULL
        AND s.status NOT IN ('completed', 'canceled', 'rejected')
    `;

    const sqlValues = [];

    if (clientId) {
        sqlQuery += ' AND s.clientId = ?';
        sqlValues.push(clientId);
    }

    if (delegationNames.length) {
        sqlQuery += ` AND t.city IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        sqlValues.push(...delegationNames);
    }

    sqlQuery += ' ORDER BY s.startDateTime DESC, sr.clockIn DESC';

    const [rows] = await pool.query(sqlQuery, sqlValues);

    return rows;
};

export default selectInProgressServicesService;
