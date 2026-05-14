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
    SELECT s.id AS serviceId, s.name, s.status, s.type, s.province,
           s.autonomousCommunity, s.hourRuleType, s.startDateTime,
           s.endDateTime, s.hours, s.scheduleImage, s.scheduleView,
           a.city, a.address, a.postCode,
           (
               SELECT GROUP_CONCAT(pa.employeeId)
               FROM personsAssigned pa
               INNER JOIN users u ON u.id = pa.employeeId
               WHERE pa.serviceId = s.id
                 AND u.active = 1
                 AND u.deletedAt IS NULL
           ) AS assignedEmployeeIds
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
