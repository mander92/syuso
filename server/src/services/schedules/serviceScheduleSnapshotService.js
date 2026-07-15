import { v4 as uuid } from 'uuid';

const normalizeSnapshotPayload = (payload) => {
    if (!payload) return { shifts: [] };
    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch {
            return { shifts: [] };
        }
    }
    return payload;
};

export const monthFromDate = (value) => {
    if (!value) return '';
    return String(value).slice(0, 7);
};

const selectScheduleRows = async (pool, serviceId, month, deletedClause) => {
    const params = [serviceId];
    let monthFilter = '';

    if (month) {
        monthFilter = 'AND DATE_FORMAT(ss.scheduleDate, "%Y-%m") = ?';
        params.push(month);
    }

    const [rows] = await pool.query(
        `
        SELECT
            ss.id,
            ss.serviceId,
            ss.employeeId,
            ss.shiftTypeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            ss.hours,
            ss.realHours,
            ss.nightHours,
            ss.holidayHours,
            ss.regularHours,
            ss.status,
            u.firstName,
            u.lastName,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor
        FROM serviceScheduleShifts ss
        LEFT JOIN users u ON u.id = ss.employeeId
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.serviceId = ?
          ${deletedClause}
          ${monthFilter}
        ORDER BY ss.scheduleDate DESC, ss.startTime DESC
        `,
        params
    );

    return rows;
};

export const listActiveScheduleRows = (pool, serviceId, month) =>
    selectScheduleRows(pool, serviceId, month, 'AND ss.deletedAt IS NULL');

export const listDeletedScheduleRows = (pool, serviceId, month) =>
    selectScheduleRows(pool, serviceId, month, 'AND ss.deletedAt IS NOT NULL');

export const listScheduleSnapshotRows = async (pool, serviceId, month) => {
    if (!month) return [];

    const [rows] = await pool.query(
        `
        SELECT payload
        FROM serviceScheduleSnapshots
        WHERE serviceId = ?
          AND month = ?
          AND deletedAt IS NULL
        LIMIT 1
        `,
        [serviceId, month]
    );

    if (!rows.length) return [];

    const payload = normalizeSnapshotPayload(rows[0].payload);
    return Array.isArray(payload.shifts) ? payload.shifts : [];
};

export const saveServiceScheduleSnapshot = async (
    pool,
    serviceId,
    month,
    updatedBy = null
) => {
    if (!serviceId || !month) return null;

    const shifts = await listActiveScheduleRows(pool, serviceId, month);

    if (!shifts.length) {
        await pool.query(
            `
            UPDATE serviceScheduleSnapshots
            SET deletedAt = CURRENT_TIMESTAMP
            WHERE serviceId = ?
              AND month = ?
              AND deletedAt IS NULL
            `,
            [serviceId, month]
        );
        return null;
    }

    const [services] = await pool.query(
        `
        SELECT
            s.id,
            s.name,
            s.type,
            s.province,
            a.city,
            a.address
        FROM services s
        LEFT JOIN addresses a ON a.id = s.addressId
        WHERE s.id = ?
        LIMIT 1
        `,
        [serviceId]
    );

    const service = services[0] || {};
    const payload = {
        service: {
            id: service.id || serviceId,
            name: service.name || '',
            type: service.type || '',
            province: service.province || '',
            city: service.city || '',
            address: service.address || '',
        },
        updatedBy,
        shifts,
    };

    const totalHours = shifts.reduce(
        (total, shift) => total + (Number(shift.hours) || 0),
        0
    );

    await pool.query(
        `
        INSERT INTO serviceScheduleSnapshots (
            id,
            serviceId,
            month,
            serviceName,
            serviceType,
            delegation,
            shiftCount,
            totalHours,
            payload
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            serviceName = VALUES(serviceName),
            serviceType = VALUES(serviceType),
            delegation = VALUES(delegation),
            shiftCount = VALUES(shiftCount),
            totalHours = VALUES(totalHours),
            payload = VALUES(payload),
            deletedAt = NULL
        `,
        [
            uuid(),
            serviceId,
            month,
            service.name || '',
            service.type || '',
            service.province || service.city || '',
            shifts.length,
            totalHours,
            JSON.stringify(payload),
        ]
    );

    return payload;
};
