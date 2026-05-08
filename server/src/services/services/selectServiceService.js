import getPool from '../../db/getPool.js';

const selectServiceService = async (
    status,
    type,
    delegationNames = [],
    startDateFrom,
    startDateTo
) => {
    const pool = await getPool();

    let sqlQuery = `
    SELECT s.id AS serviceId, s.name, s.status, s.type, s.province, s.startDateTime, s.endDateTime, s.hours, s.scheduleImage, a.city, a.address, a.postCode
    FROM addresses a
    INNER JOIN services s
    ON a.id = s.addressId
    WHERE s.deletedAt IS NULL
    `;

    let sqlValues = [];

    if (status) {
        sqlQuery += ' AND status = ?';
        sqlValues.push(status);
    }

    if (type) {
        sqlQuery += ' AND s.type = ?';
        sqlValues.push(type);
    }

    if (delegationNames.length) {
        sqlQuery += ` AND s.province IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        sqlValues.push(...delegationNames);
    }

    if (startDateFrom) {
        sqlQuery += ' AND DATE(s.startDateTime) >= ?';
        sqlValues.push(startDateFrom);
    }

    if (startDateTo) {
        sqlQuery += ' AND DATE(s.startDateTime) <= ?';
        sqlValues.push(startDateTo);
    }

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};
export default selectServiceService;
