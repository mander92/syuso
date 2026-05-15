import getPool from '../../db/getPool.js';

const selectServiceByEmployeeIdService = async (status, type, employeeId) => {
    const pool = await getPool();

    let sqlQuery = `
        SELECT  pa.id, s.id AS serviceId, ? AS employeeId, s.id, s.name, s.status,
                s.scheduleImage, s.scheduleView, s.locationLink,
                u.firstName, u.lastName, u.phone, s.type, s.province,
                s.autonomousCommunity, s.hourRuleType,
                s.comments, s.startDateTime, s.hours, s.status,
                s.allowUnscheduledClockIn, s.clockInEarlyMinutes,
                a.address, a.city, a.postCode,
                (
                    SELECT COUNT(*)
                    FROM serviceNfcTags snt
                    WHERE snt.serviceId = s.id
                ) AS nfcCount
        FROM services s
        LEFT JOIN personsAssigned pa
        ON pa.serviceId = s.id AND pa.employeeId = ?
        INNER JOIN addresses a
        ON s.addressId = a.id
        INNER JOIN users u
        ON u.id = s.clientId
        WHERE s.deletedAt IS NULL
          AND pa.employeeId IS NOT NULL
         
        `;

    let sqlValues = [employeeId, employeeId];

    if (status) {
        sqlQuery += ' AND s.status = ?';
        sqlValues.push(status);
    }

    if (type) {
        sqlQuery += ' AND s.type = ?';
        sqlValues.push(type);
    }

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};

export default selectServiceByEmployeeIdService;
