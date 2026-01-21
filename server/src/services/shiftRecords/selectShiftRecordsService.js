import getPool from '../../db/getPool.js';
import createExcelUtil from '../../utils/createExcelUtil.js';
import { formatDateMadrid } from '../../utils/dateTimeMadrid.js';
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
        s.realClockIn, s.realClockOut,
        s.latitudeIn, s.longitudeIn, s.latitudeOut, s.longitudeOut,
        wr.id AS reportId, wr.reportDate, se.name AS serviceName, se.status, se.hours, se.startDateTime, a.city, a.address, t.type, t.city AS province,
        TIMESTAMPDIFF(HOUR, s.clockIn, s.clockOut) AS hoursWorked,
        MOD(TIMESTAMPDIFF(MINUTE, s.clockIn, s.clockOut), 60) AS minutesWorked,
        TIMESTAMPDIFF(HOUR, s.realClockIn, s.realClockOut) AS realHoursWorked,
        MOD(TIMESTAMPDIFF(MINUTE, s.realClockIn, s.realClockOut), 60) AS realMinutesWorked
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

    sqlQueryDetails += ' ORDER BY s.clockIn DESC';

    const [rowsDetails] = await pool.query(
        sqlQueryDetails,
        sqlValuesDetails
    );

    let sqlQueryTotal = `
        SELECT 
        s.employeeId, u.firstName, u.lastName, se.name AS serviceName,
        SUM(TIMESTAMPDIFF(HOUR, s.clockIn, s.clockOut)) AS totalHoursWorked,
        SUM(MOD(TIMESTAMPDIFF(MINUTE, s.clockIn, s.clockOut), 60)) AS totalMinutesWorked,
        SUM(TIMESTAMPDIFF(HOUR, s.realClockIn, s.realClockOut)) AS totalRealHoursWorked,
        SUM(MOD(TIMESTAMPDIFF(MINUTE, s.realClockIn, s.realClockOut), 60)) AS totalRealMinutesWorked
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
        GROUP BY s.employeeId, u.firstName, u.lastName, se.name 
        ORDER BY totalHoursWorked DESC
    `;

    const [rowsTotal] = await pool.query(sqlQueryTotal, sqlValuesTotal);

    const data = { details: rowsDetails, totals: rowsTotal };

    if (generateExcel) {
        const toNumber = (value) => Number(value || 0);
        const formatDiff = (minutes) => {
            const total = Number(minutes || 0);
            const sign = total < 0 ? '-' : '';
            const abs = Math.abs(total);
            const diffHours = Math.floor(abs / 60);
            const diffMinutes = abs % 60;
            return `${sign}${diffHours}h ${diffMinutes}m`;
        };

        const detailRows = rowsDetails.map((row) => {
            const partMinutes =
                toNumber(row.hoursWorked) * 60 + toNumber(row.minutesWorked);
            const realMinutes =
                toNumber(row.realHoursWorked) * 60 +
                toNumber(row.realMinutesWorked);
            const diffMinutes = partMinutes - realMinutes;

            return {
                day: formatDateMadrid(row.realClockIn || row.clockIn),
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                serviceName: row.serviceName || '',
                hoursWorked: row.hoursWorked ?? 0,
                minutesWorked: row.minutesWorked ?? 0,
                realHoursWorked: row.realHoursWorked ?? 0,
                realMinutesWorked: row.realMinutesWorked ?? 0,
                diffWorked: formatDiff(diffMinutes),
            };
        });

        const totalRows = rowsTotal.map((row) => {
            const partMinutes =
                toNumber(row.totalHoursWorked) * 60 +
                toNumber(row.totalMinutesWorked);
            const realMinutes =
                toNumber(row.totalRealHoursWorked) * 60 +
                toNumber(row.totalRealMinutesWorked);
            const diffMinutes = partMinutes - realMinutes;

            return {
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                serviceName: row.serviceName || '',
                totalHoursWorked: toNumber(row.totalHoursWorked),
                totalMinutesWorked: toNumber(row.totalMinutesWorked),
                totalRealHoursWorked: toNumber(row.totalRealHoursWorked),
                totalRealMinutesWorked: toNumber(row.totalRealMinutesWorked),
                diffWorked: formatDiff(diffMinutes),
            };
        });

        const sheets = [
            {
                name: 'Desglose',
                columns: [
                    { header: 'Dia', key: 'day', width: 14 },
                    { header: 'Nombre', key: 'firstName', width: 20 },
                    { header: 'Apellidos', key: 'lastName', width: 20 },
                    { header: 'Servicio', key: 'serviceName', width: 30 },
                    { header: 'Horas', key: 'hoursWorked', width: 12 },
                    { header: 'Minutos', key: 'minutesWorked', width: 12 },
                    { header: 'Horas reales', key: 'realHoursWorked', width: 14 },
                    {
                        header: 'Minutos reales',
                        key: 'realMinutesWorked',
                        width: 16,
                    },
                    { header: 'Diferencia', key: 'diffWorked', width: 14 },
                ],
                rows: detailRows,
            },
            {
                name: 'Totales',
                columns: [
                    { header: 'Nombre', key: 'firstName', width: 20 },
                    { header: 'Apellidos', key: 'lastName', width: 20 },
                    { header: 'Servicio', key: 'serviceName', width: 30 },
                    {
                        header: 'Total Horas',
                        key: 'totalHoursWorked',
                        width: 14,
                    },
                    {
                        header: 'Total Minutos',
                        key: 'totalMinutesWorked',
                        width: 16,
                    },
                    {
                        header: 'Total horas reales',
                        key: 'totalRealHoursWorked',
                        width: 16,
                    },
                    {
                        header: 'Total minutos reales',
                        key: 'totalRealMinutesWorked',
                        width: 18,
                    },
                    { header: 'Diferencia', key: 'diffWorked', width: 14 },
                ],
                rows: totalRows,
            },
        ];

        const filePath = await createExcelUtil(
            sheets,
            null,
            'shiftRecords.xlsx'
        );

        const publicUrl = `/uploads/documents/${path.basename(filePath)}`;
        return { ...data, excelFilePath: publicUrl };
    }

    return data;
};

export default selectShiftRecordsService;
