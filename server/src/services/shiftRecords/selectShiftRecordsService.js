import getPool from '../../db/getPool.js';
import createExcelUtil from '../../utils/createExcelUtil.js';
import path from 'path';

const selectShiftRecordsService = async (
    typeOfService,
    employeeId,
    city,
    serviceId,
    serviceName,
    startDate,
    endDate,
    generateExcel,
    delegationNames = []
) => {
    const pool = await getPool();

    let sqlQueryDetails = `
        SELECT 
        s.id, s.serviceId, s.employeeId, u.firstName, u.lastName, s.clockIn, s.clockOut,
        s.latitudeIn, s.longitudeIn, s.latitudeOut, s.longitudeOut,
        wr.id AS reportId, se.name AS serviceName, se.status, se.hours, se.startDateTime, a.city, a.address, t.type, t.city AS province,
        TIMESTAMPDIFF(HOUR, s.clockIn, s.clockOut) AS hoursWorked,
        MOD(TIMESTAMPDIFF(MINUTE, s.clockIn, s.clockOut), 60) AS minutesWorked
        FROM shiftRecords s 
        INNER JOIN users u 
        ON u.id = s.employeeId
        LEFT JOIN workReports wr
        ON wr.shiftRecordId = s.id
        INNER JOIN services se 
        ON se.id = s.serviceId
        INNER JOIN addresses a 
        ON a.id = se.addressId
        INNER JOIN typeOfServices t 
        ON t.id = se.typeOfServicesId
        WHERE 1=1
    `;

    const sqlValuesDetails = [];

    if (typeOfService) {
        sqlQueryDetails += ' AND t.type = ?';
        sqlValuesDetails.push(typeOfService);
    }

    if (employeeId) {
        sqlQueryDetails += ' AND s.employeeId = ?';
        sqlValuesDetails.push(employeeId);
    }

    if (city) {
        sqlQueryDetails += ' AND a.city = ?';
        sqlValuesDetails.push(city);
    }

    if (serviceId) {
        sqlQueryDetails += ' AND s.serviceId = ?';
        sqlValuesDetails.push(serviceId);
    }

    if (serviceName) {
        sqlQueryDetails += ' AND se.name = ?';
        sqlValuesDetails.push(serviceName);
    }

    if (startDate && endDate) {
        sqlQueryDetails += ' AND se.startDateTime BETWEEN ? AND ?';
        sqlValuesDetails.push(startDate, endDate);
    }

    if (delegationNames.length) {
        sqlQueryDetails += ` AND t.city IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        sqlValuesDetails.push(...delegationNames);
    }

    sqlQueryDetails += ' ORDER BY s.modifiedAt DESC';

    const [rowsDetails] = await pool.query(
        sqlQueryDetails,
        sqlValuesDetails
    );

    let sqlQueryTotal = `
        SELECT 
        s.employeeId, u.firstName, u.lastName,
        SUM(TIMESTAMPDIFF(HOUR, s.clockIn, s.clockOut)) AS totalHoursWorked,
        SUM(MOD(TIMESTAMPDIFF(MINUTE, s.clockIn, s.clockOut), 60)) AS totalMinutesWorked
        FROM shiftRecords s 
        INNER JOIN users u 
        ON u.id = s.employeeId
        INNER JOIN services se 
        ON se.id = s.serviceId
        INNER JOIN addresses a 
        ON a.id = se.addressId
        INNER JOIN typeOfServices t 
        ON t.id = se.typeOfServicesId
        WHERE 1=1
    `;

    const sqlValuesTotal = [];

    if (typeOfService) {
        sqlQueryTotal += ' AND t.type = ?';
        sqlValuesTotal.push(typeOfService);
    }

    if (employeeId) {
        sqlQueryTotal += ' AND s.employeeId = ?';
        sqlValuesTotal.push(employeeId);
    }

    if (city) {
        sqlQueryTotal += ' AND a.city = ?';
        sqlValuesTotal.push(city);
    }

    if (serviceId) {
        sqlQueryTotal += ' AND s.serviceId = ?';
        sqlValuesTotal.push(serviceId);
    }

    if (serviceName) {
        sqlQueryTotal += ' AND se.name = ?';
        sqlValuesTotal.push(serviceName);
    }

    if (startDate && endDate) {
        sqlQueryTotal += ' AND se.startDateTime BETWEEN ? AND ?';
        sqlValuesTotal.push(startDate, endDate);
    }

    if (delegationNames.length) {
        sqlQueryTotal += ` AND t.city IN (${delegationNames
            .map(() => '?')
            .join(', ')})`;
        sqlValuesTotal.push(...delegationNames);
    }

    sqlQueryTotal += `
        GROUP BY s.employeeId, u.firstName, u.lastName 
        ORDER BY totalHoursWorked DESC
    `;

    const [rowsTotal] = await pool.query(sqlQueryTotal, sqlValuesTotal);

    const data = { details: rowsDetails, totals: rowsTotal };

    if (generateExcel) {
        const columns = [
            { header: 'Nombre', key: 'firstName', width: 20 },
            { header: 'Apellidos', key: 'lastName', width: 20 },

            {
                header: 'Total Horas',
                key: 'totalHoursWorked',
                width: 20,
            },
            {
                header: 'Total Minutos',
                key: 'totalMinutesWorked',
                width: 20,
            },
        ];

        const filePath = await createExcelUtil(
            rowsTotal,
            columns,
            'shiftRecords.xlsx'
        );

        const publicUrl = `/uploads/documents/${path.basename(filePath)}`;
        return { ...data, excelFilePath: publicUrl };
    }

    return data;
};

export default selectShiftRecordsService;
