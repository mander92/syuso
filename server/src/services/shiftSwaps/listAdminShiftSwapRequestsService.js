import getPool from '../../db/getPool.js';

const listAdminShiftSwapRequestsService = async () => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT
            ssr.id,
            ssr.serviceId,
            ssr.requestType,
            ssr.fromShiftId,
            ssr.toShiftId,
            ssr.fromShiftIds,
            ssr.toShiftIds,
            ssr.requestorId,
            ssr.counterpartId,
            s.name AS serviceName,
            CONCAT(COALESCE(requestor.firstName, ''), ' ', COALESCE(requestor.lastName, '')) AS requestorName,
            requestor.email AS requestorEmail,
            CONCAT(COALESCE(counterpart.firstName, ''), ' ', COALESCE(counterpart.lastName, '')) AS counterpartName,
            counterpart.email AS counterpartEmail,
            (
                SELECT GROUP_CONCAT(
                    CONCAT(
                        DATE_FORMAT(ss.scheduleDate, '%d/%m/%Y'),
                        ' ',
                        TIME_FORMAT(ss.startTime, '%H:%i'),
                        ' - ',
                        TIME_FORMAT(ss.endTime, '%H:%i'),
                        IF(st.name IS NULL OR st.name = '', '', CONCAT(' | ', st.name))
                    )
                    ORDER BY ss.scheduleDate, ss.startTime
                    SEPARATOR ' / '
                )
                FROM serviceScheduleShifts ss
                LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
                WHERE ss.deletedAt IS NULL
                  AND (
                    ss.id = ssr.fromShiftId
                    OR (
                        ssr.fromShiftIds IS NOT NULL
                        AND JSON_CONTAINS(ssr.fromShiftIds, JSON_QUOTE(ss.id), '$')
                    )
                  )
            ) AS fromShiftSummary,
            (
                SELECT GROUP_CONCAT(
                    CONCAT(
                        DATE_FORMAT(ss.scheduleDate, '%d/%m/%Y'),
                        ' ',
                        TIME_FORMAT(ss.startTime, '%H:%i'),
                        ' - ',
                        TIME_FORMAT(ss.endTime, '%H:%i'),
                        IF(st.name IS NULL OR st.name = '', '', CONCAT(' | ', st.name))
                    )
                    ORDER BY ss.scheduleDate, ss.startTime
                    SEPARATOR ' / '
                )
                FROM serviceScheduleShifts ss
                LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
                WHERE ss.deletedAt IS NULL
                  AND (
                    ss.id = ssr.toShiftId
                    OR (
                        ssr.toShiftIds IS NOT NULL
                        AND JSON_CONTAINS(ssr.toShiftIds, JSON_QUOTE(ss.id), '$')
                    )
                  )
            ) AS toShiftSummary,
            ssr.status,
            ssr.reason,
            ssr.decidedBy,
            ssr.decidedAt,
            ssr.createdAt
        FROM shiftSwapRequests ssr
        INNER JOIN services s ON s.id = ssr.serviceId
        INNER JOIN users requestor ON requestor.id = ssr.requestorId
        INNER JOIN users counterpart ON counterpart.id = ssr.counterpartId
        WHERE ssr.status IN ('pending_admin', 'pending', 'approved', 'rejected')
        ORDER BY ssr.createdAt DESC
        `
    );

    return rows;
};

export default listAdminShiftSwapRequestsService;
