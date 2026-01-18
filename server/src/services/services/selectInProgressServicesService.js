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
            pa.id AS assignmentId,
            pa.employeeId,
            u.firstName,
            u.lastName
        FROM services s
        INNER JOIN addresses a ON a.id = s.addressId
        INNER JOIN typeOfServices t ON t.id = s.typeOfServicesId
        LEFT JOIN personsAssigned pa ON pa.serviceId = s.id
        LEFT JOIN users u ON u.id = pa.employeeId
        WHERE s.deletedAt IS NULL
        AND s.status = 'confirmed'
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

    sqlQuery += ' ORDER BY s.startDateTime DESC';

    const [rows] = await pool.query(sqlQuery, sqlValues);

    return rows;
};

export default selectInProgressServicesService;
