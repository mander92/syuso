import getPool from '../../db/getPool.js';

const listBillingRecordsService = async ({
    serviceId,
    status,
    fromDate,
    toDate,
    pendingMonth,
} = {}) => {
    const pool = await getPool();
    const filters = ['br.deletedAt IS NULL'];
    const values = [];

    if (serviceId) {
        filters.push('br.serviceId = ?');
        values.push(serviceId);
    }

    if (status) {
        filters.push('br.status = ?');
        values.push(status);
    }

    if (fromDate) {
        filters.push('br.periodEnd >= ?');
        values.push(fromDate);
    }

    if (toDate) {
        filters.push('br.periodStart <= ?');
        values.push(toDate);
    }

    const getMonthRange = (month) => {
        const [year, monthNumber] = String(month || '')
            .split('-')
            .map(Number);
        if (!year || !monthNumber) return {};
        const start = new Date(Date.UTC(year, monthNumber - 1, 1));
        const end = new Date(Date.UTC(year, monthNumber, 0));
        return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
        };
    };

    const pendingRange = getMonthRange(pendingMonth);

    const [records] = await pool.query(
        `
        SELECT
            br.*,
            s.name AS serviceName,
            s.status AS serviceStatus,
            s.province AS serviceDelegation,
            s.hourlyRate AS serviceHourlyRate,
            s.billingStartDay,
            s.billingEndDay,
            CONCAT_WS(' ', client.firstName, client.lastName) AS clientName,
            client.email AS clientEmail,
            CONCAT_WS(' ', requester.firstName, requester.lastName) AS requestedByName,
            CONCAT_WS(' ', sender.firstName, sender.lastName) AS sentByName
        FROM billingRecords br
        INNER JOIN services s ON s.id = br.serviceId
        LEFT JOIN users client ON client.id = br.clientId
        LEFT JOIN users requester ON requester.id = br.requestedBy
        LEFT JOIN users sender ON sender.id = br.sentBy
        WHERE ${filters.join(' AND ')}
        ORDER BY br.periodStart DESC, br.periodEnd DESC, br.createdAt DESC
        LIMIT 500
        `,
        values
    );

    const [services] = await pool.query(
        `
        SELECT
            s.id,
            s.name,
            s.status,
            s.province,
            s.hourlyRate,
            s.billingConcept,
            s.billingStartDay,
            s.billingEndDay,
            s.clientId,
            CONCAT_WS(' ', u.firstName, u.lastName) AS clientName,
            u.email AS clientEmail,
            GROUP_CONCAT(
                DISTINCT DATE_FORMAT(ss.scheduleDate, '%Y-%m')
                ORDER BY ss.scheduleDate
                SEPARATOR ','
            ) AS scheduleMonths
        FROM services s
        LEFT JOIN users u ON u.id = s.clientId
        LEFT JOIN serviceScheduleShifts ss
            ON ss.serviceId = s.id
           AND ss.deletedAt IS NULL
        WHERE s.deletedAt IS NULL
          AND s.status IN ('confirmed', 'completed')
        GROUP BY
            s.id,
            s.name,
            s.status,
            s.province,
            s.hourlyRate,
            s.billingConcept,
            s.billingStartDay,
            s.billingEndDay,
            s.clientId,
            clientName,
            u.email
        ORDER BY s.name ASC
        `
    );

    const [pendingServices] = await pool.query(
        `
        SELECT
            s.id,
            s.name,
            s.status,
            s.province,
            s.hourlyRate,
            s.billingConcept,
            CONCAT_WS(' ', u.firstName, u.lastName) AS clientName,
            u.email AS clientEmail,
            COALESCE(SUM(CASE
                WHEN COALESCE(ss.realHours, 0) > 0 THEN ss.realHours
                ELSE COALESCE(ss.hours, 0)
            END), 0) AS totalScheduledHours
        FROM services s
        LEFT JOIN users u ON u.id = s.clientId
        INNER JOIN serviceScheduleShifts ss
            ON ss.serviceId = s.id
           AND ss.deletedAt IS NULL
           ${
               pendingRange.start && pendingRange.end
                   ? 'AND ss.scheduleDate BETWEEN ? AND ?'
                   : ''
           }
        WHERE s.deletedAt IS NULL
          AND s.status IN ('confirmed', 'completed')
          AND NOT EXISTS (
              SELECT 1
              FROM billingRecords br
              WHERE br.serviceId = s.id
                AND br.deletedAt IS NULL
                AND br.status <> 'cancelled'
                ${
                    pendingRange.start && pendingRange.end
                        ? 'AND br.periodStart <= ? AND br.periodEnd >= ?'
                        : ''
                }
          )
          AND NOT EXISTS (
              SELECT 1
              FROM billingIgnoredPeriods bip
              WHERE bip.serviceId = s.id
                AND bip.deletedAt IS NULL
                ${
                    pendingRange.start && pendingRange.end
                        ? 'AND bip.periodStart <= ? AND bip.periodEnd >= ?'
                        : ''
                }
          )
        GROUP BY s.id, s.name, s.status, s.province, s.hourlyRate, s.billingConcept, clientName, u.email
        ORDER BY s.name ASC
        `
        ,
        pendingRange.start && pendingRange.end
            ? [
                  pendingRange.start,
                  pendingRange.end,
                  pendingRange.end,
                  pendingRange.start,
                  pendingRange.end,
                  pendingRange.start,
              ]
            : []
    );

    return { records, services, pendingServices };
};

export default listBillingRecordsService;
