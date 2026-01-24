import getPool from '../../db/getPool.js';

const selectServiceByEmployeeIdService = async (status, type, employeeId) => {
    const pool = await getPool();

    let sqlQuery = `
        SELECT  pa.id, pa.serviceId, pa.employeeId, s.id, s.name, s.status, s.scheduleImage, s.scheduleView, s.locationLink, u.firstName, u.lastName, u.phone, t.type, t.city AS province, s.comments, s.startDateTime, s.hours, s.status, a.address, a.city, a.postCode,
                (
                    SELECT COUNT(*)
                    FROM serviceNfcTags snt
                    WHERE snt.serviceId = s.id
                ) AS nfcCount
        FROM personsAssigned pa
        INNER JOIN services s
        ON pa.serviceId = s.id
        INNER JOIN addresses a
        ON s.addressId = a.id
        INNER JOIN users u
        ON u.id = s.clientId
        INNER JOIN typeOfServices t
        ON t.id = s.typeOfServicesId
        WHERE pa.employeeId = ?
         
        `;

    let sqlValues = [employeeId];

    if (status) {
        sqlQuery += ' AND s.status = ?';
        sqlValues.push(status);
    }

    if (type) {
        sqlQuery += ' AND t.type = ?';
        sqlValues.push(type);
    }

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};

export default selectServiceByEmployeeIdService;
