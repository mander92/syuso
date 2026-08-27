import path from 'path';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import createExcelUtil from '../../utils/createExcelUtil.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const getMonthRange = (month) => {
    const [year, monthNumber] = String(month || '').split('-').map(Number);
    if (!year || !monthNumber) generateErrorUtil('Mes no valido', 400);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 0));
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
};

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const roundMoney = (value) => Number((toNumber(value)).toFixed(2));

const getRateKey = (serviceId, employeeId = '') => `${serviceId}:${employeeId || ''}`;

const SECURITY_AGREEMENT = {
    monthlyRegularHours: 162,
    nightRates: {
        2026: 1.26,
        2027: 1.3,
        2028: 1.35,
        2029: 1.4,
        2030: 1.46,
    },
    holidayRates: {
        2026: 1.02,
        2027: 1.06,
        2028: 1.1,
        2029: 1.14,
        2030: 1.19,
    },
};

const getAgreementYear = (month) => {
    const year = Number(String(month || '').slice(0, 4));
    if (year < 2026) return 2026;
    if (year > 2030) return 2030;
    return year || 2026;
};

const getAgreementDefaults = (month) => {
    const year = getAgreementYear(month);
    return {
        year,
        monthlyRegularHours: SECURITY_AGREEMENT.monthlyRegularHours,
        nightRate: SECURITY_AGREEMENT.nightRates[year],
        holidayRate: SECURITY_AGREEMENT.holidayRates[year],
    };
};

const getDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
};

const countOverlapDays = (startDate, endDate, rangeStart, rangeEnd) => {
    const startKey = getDateKey(startDate) > rangeStart ? getDateKey(startDate) : rangeStart;
    const endKey = getDateKey(endDate) < rangeEnd ? getDateKey(endDate) : rangeEnd;
    const start = new Date(`${startKey}T00:00:00Z`);
    const end = new Date(`${endKey}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return 0;
    }
    return Math.floor((end - start) / 86400000) + 1;
};

const normalizeRate = (rate) => ({
    id: rate?.id || '',
    serviceId: rate?.serviceId || '',
    employeeId: rate?.employeeId || '',
    payMode: rate?.payMode || 'hourly',
    amountType: rate?.amountType || 'gross',
    regularRate: toNumber(rate?.regularRate),
    nightRate: toNumber(rate?.nightRate),
    holidayRate: toNumber(rate?.holidayRate),
    extraRate: toNumber(rate?.extraRate),
    fixedAmount: toNumber(rate?.fixedAmount),
    tierRules: normalizeTierRules(rate?.tierRules),
    notes: rate?.notes || '',
});

const parseJsonField = (value, fallback) => {
    if (!value) return fallback;
    if (Array.isArray(value) || typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeTierRules = (value) =>
    parseJsonField(value, [])
        .map((rule) => ({
            fromHour: toNumber(rule?.fromHour),
            toHour:
                rule?.toHour === undefined || rule?.toHour === null || rule?.toHour === ''
                    ? null
                    : toNumber(rule.toHour),
            amountType: rule?.amountType === 'net' ? 'net' : 'gross',
            regularRate: toNumber(rule?.regularRate),
            nightRate: toNumber(rule?.nightRate),
            holidayRate: toNumber(rule?.holidayRate),
            extraRate: toNumber(rule?.extraRate),
            notes: rule?.notes || '',
        }))
        .filter((rule) => rule.toHour === null || rule.toHour > rule.fromHour)
        .sort((a, b) => a.fromHour - b.fromHour);

const buildRateMap = (rates) => {
    const map = new Map();
    rates.forEach((rate) => {
        map.set(getRateKey(rate.serviceId, rate.employeeId || ''), normalizeRate(rate));
    });
    return map;
};

const scaleRowHours = (row, payableHours) => {
    const totalHours = toNumber(row.totalHours);
    const factor = totalHours > 0 ? Math.max(toNumber(payableHours), 0) / totalHours : 0;
    return {
        ...row,
        totalHours: roundMoney(payableHours),
        baseHours: roundMoney(toNumber(row.baseHours) * factor),
        nightHours: roundMoney(toNumber(row.nightHours) * factor),
        holidayHours: roundMoney(toNumber(row.holidayHours) * factor),
        extraHours: roundMoney(toNumber(row.extraHours) * factor),
    };
};

const sliceRowHours = (row, fromHour, toHour) => {
    const totalHours = toNumber(row.totalHours);
    const start = Math.max(toNumber(fromHour), 0);
    const end = toHour === null ? totalHours : Math.min(toNumber(toHour), totalHours);
    const slicedHours = Math.max(end - start, 0);
    return scaleRowHours(row, slicedHours);
};

const calculateLineAmount = ({ row, rate, month }) => {
    if (!rate?.id) return 0;
    if (rate.payMode === 'fixed') return roundMoney(rate.fixedAmount);

    const nightHours = toNumber(row.nightHours);
    const holidayHours = toNumber(row.holidayHours);
    const extraHours = toNumber(row.extraHours);
    const baseHours = Math.max(toNumber(row.baseHours), 0);

    if (rate.payMode === 'agreement') {
        const defaults = getAgreementDefaults(month);
        const nightRate = rate.nightRate || defaults.nightRate || rate.regularRate;
        const holidayRate = rate.holidayRate || defaults.holidayRate || rate.regularRate;
        const extraRate = rate.extraRate || rate.regularRate;

        return roundMoney(
            baseHours * rate.regularRate +
                nightHours * nightRate +
                holidayHours * holidayRate +
                extraHours * extraRate
        );
    }

    return roundMoney(
        baseHours * rate.regularRate +
            nightHours * (rate.nightRate || rate.regularRate) +
            holidayHours * (rate.holidayRate || rate.regularRate)
    );
};

const calculateLinePayment = ({ row, rate, month }) => {
    if (!rate?.tierRules?.length || rate.payMode === 'fixed') {
        return {
            amount: calculateLineAmount({ row, rate, month }),
            amountType: rate.payMode === 'agreement' ? 'gross' : rate.amountType || 'gross',
            tierBreakdown: [],
        };
    }

    const tierBreakdown = [];
    const totals = rate.tierRules.reduce(
        (acc, rule) => {
            const tierRow = sliceRowHours(row, rule.fromHour, rule.toHour);
            if (toNumber(tierRow.totalHours) <= 0) return acc;
            const tierRate = {
                ...rate,
                amountType: rule.amountType,
                regularRate: rule.regularRate || rate.regularRate,
                nightRate: rule.nightRate || rate.nightRate,
                holidayRate: rule.holidayRate || rate.holidayRate,
                extraRate: rule.extraRate || rate.extraRate,
                tierRules: [],
            };
            const amount = calculateLineAmount({ row: tierRow, rate: tierRate, month });
            if (tierRate.amountType === 'net') acc.net += amount;
            else acc.gross += amount;
            tierBreakdown.push({
                fromHour: rule.fromHour,
                toHour: rule.toHour,
                hours: tierRow.totalHours,
                amount,
                amountType: tierRate.amountType,
            });
            return acc;
        },
        { gross: 0, net: 0 }
    );

    return {
        amount: roundMoney(totals.gross + totals.net),
        amountType: totals.net > 0 && totals.gross === 0 ? 'net' : 'gross',
        grossAmount: roundMoney(totals.gross),
        netAmount: roundMoney(totals.net),
        tierBreakdown,
    };
};

const getViewerDelegations = async ({ viewerId, viewerRole }) => {
    if (viewerRole !== 'admin') return [];
    return selectAdminDelegationNamesService(viewerId);
};

const buildSalaryFilters = async ({
    viewerId,
    viewerRole,
    start,
    end,
    employeeId = '',
    serviceId = '',
    delegation = '',
    tableAlias = 'ss',
}) => {
    const values = [start, end];
    const filters = [
        `${tableAlias}.deletedAt IS NULL`,
        `${tableAlias}.employeeId IS NOT NULL`,
        `${tableAlias}.scheduleDate BETWEEN ? AND ?`,
    ];

    if (employeeId) {
        filters.push(`${tableAlias}.employeeId = ?`);
        values.push(employeeId);
    }

    if (serviceId) {
        filters.push(`${tableAlias}.serviceId = ?`);
        values.push(serviceId);
    }

    if (delegation) {
        filters.push('(u.city = ? OR s.province = ?)');
        values.push(delegation, delegation);
    }

    if (viewerRole === 'admin') {
        const delegations = await getViewerDelegations({ viewerId, viewerRole });
        if (!delegations.length) return null;
        filters.push(
            `(u.city IN (${delegations.map(() => '?').join(', ')}) OR s.province IN (${delegations.map(() => '?').join(', ')}))`
        );
        values.push(...delegations, ...delegations);
    }

    return { filters, values };
};

const listSalaryOptions = async ({
    viewerId,
    viewerRole,
    month,
    employeeId = '',
    serviceId = '',
    delegation = '',
}) => {
    const pool = await getPool();
    const { start, end } = getMonthRange(month);
    const filterData = await buildSalaryFilters({
        viewerId,
        viewerRole,
        start,
        end,
        employeeId: '',
        serviceId,
        delegation,
    });
    if (!filterData) return { employees: [], services: [], delegations: [] };

    const [employees] = await pool.query(
        `
        SELECT DISTINCT u.id, u.firstName, u.lastName, u.email, u.dni, u.city, u.active,
               ed.bankAccount
        FROM serviceScheduleShifts ss
        INNER JOIN users u ON u.id = ss.employeeId
        INNER JOIN services s ON s.id = ss.serviceId
        LEFT JOIN employeeDocumentations ed ON ed.userId = u.id
        WHERE ${filterData.filters.join(' AND ')}
        ORDER BY u.firstName, u.lastName
        `,
        filterData.values
    );

    const serviceFilterData = await buildSalaryFilters({
        viewerId,
        viewerRole,
        start,
        end,
        employeeId,
        serviceId: '',
        delegation,
    });
    if (!serviceFilterData) return { employees: [], services: [], delegations: [] };

    const [services] = await pool.query(
        `
        SELECT DISTINCT s.id, s.name, s.type, s.province, s.hourRuleType
        FROM serviceScheduleShifts ss
        INNER JOIN users u ON u.id = ss.employeeId
        INNER JOIN services s ON s.id = ss.serviceId
        WHERE ${serviceFilterData.filters.join(' AND ')}
        ORDER BY s.name, s.type
        `,
        serviceFilterData.values
    );

    const [delegations] = await pool.query(
        `
        SELECT DISTINCT COALESCE(NULLIF(u.city, ''), NULLIF(s.province, '')) AS name
        FROM serviceScheduleShifts ss
        INNER JOIN users u ON u.id = ss.employeeId
        INNER JOIN services s ON s.id = ss.serviceId
        WHERE ${serviceFilterData.filters.join(' AND ')}
        HAVING name IS NOT NULL
        ORDER BY name
        `,
        serviceFilterData.values
    );

    return { employees, services, delegations };
};

const listVisibleServices = async ({ viewerId, viewerRole }) => {
    const pool = await getPool();
    const values = [];
    let serviceFilter = '';

    if (viewerRole === 'admin') {
        const delegations = await getViewerDelegations({ viewerId, viewerRole });
        if (!delegations.length) return [];
        serviceFilter = `AND s.province IN (${delegations.map(() => '?').join(', ')})`;
        values.push(...delegations);
    }

    const [services] = await pool.query(
        `
        SELECT s.id, s.name, s.type, s.province, s.hourRuleType
        FROM services s
        WHERE s.deletedAt IS NULL
          ${serviceFilter}
        ORDER BY s.name, s.type
        `,
        values
    );

    return services;
};

const listSalaryRates = async ({ serviceId = '', employeeId = '' } = {}) => {
    const pool = await getPool();
    const filters = ['r.deletedAt IS NULL'];
    const values = [];

    if (serviceId) {
        filters.push('r.serviceId = ?');
        values.push(serviceId);
    }
    if (employeeId) {
        filters.push('(r.employeeId = ? OR r.employeeId IS NULL)');
        values.push(employeeId);
    }

    const [rows] = await pool.query(
        `
        SELECT r.*, s.name AS serviceName, s.type AS serviceType,
               CONCAT_WS(' ', u.firstName, u.lastName) AS employeeName
        FROM salaryServiceRates r
        INNER JOIN services s ON s.id = r.serviceId
        LEFT JOIN users u ON u.id = r.employeeId
        WHERE ${filters.join(' AND ')}
        ORDER BY s.name, employeeName
        `,
        values
    );
    return rows.map((row) => ({
        ...row,
        tierRules: normalizeTierRules(row.tierRules),
    }));
};

const listSalaryRatesForServices = async (serviceIds) => {
    if (!serviceIds.length) return [];
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT r.*, s.name AS serviceName, s.type AS serviceType,
               CONCAT_WS(' ', u.firstName, u.lastName) AS employeeName
        FROM salaryServiceRates r
        INNER JOIN services s ON s.id = r.serviceId
        LEFT JOIN users u ON u.id = r.employeeId
        WHERE r.deletedAt IS NULL
          AND r.serviceId IN (${serviceIds.map(() => '?').join(', ')})
        ORDER BY s.name, employeeName
        `,
        serviceIds
    );
    return rows.map((row) => ({
        ...row,
        tierRules: normalizeTierRules(row.tierRules),
    }));
};

const upsertSalaryRate = async ({ userId, payload }) => {
    const pool = await getPool();
    const employeeId = payload.employeeId || null;
    const payMode = payload.payMode || 'hourly';
    const amountType = payMode === 'agreement' ? 'gross' : payload.amountType || 'gross';
    const [services] = await pool.query(
        'SELECT id FROM services WHERE id = ? AND deletedAt IS NULL',
        [payload.serviceId]
    );
    if (!services.length) generateErrorUtil('Servicio no encontrado', 404);

    const [existing] = await pool.query(
        `
        SELECT id
        FROM salaryServiceRates
        WHERE serviceId = ?
          AND employeeId <=> ?
          AND deletedAt IS NULL
        LIMIT 1
        `,
        [payload.serviceId, employeeId]
    );

    const values = [
        payMode,
        amountType,
        toNumber(payload.regularRate),
        toNumber(payload.nightRate),
        toNumber(payload.holidayRate),
        toNumber(payload.extraRate),
        toNumber(payload.fixedAmount),
        JSON.stringify(normalizeTierRules(payload.tierRules)),
        payload.notes || null,
    ];

    if (existing.length) {
        await pool.query(
            `
            UPDATE salaryServiceRates
            SET payMode = ?, amountType = ?, regularRate = ?, nightRate = ?,
                holidayRate = ?, extraRate = ?, fixedAmount = ?, tierRules = ?, notes = ?
            WHERE id = ?
            `,
            [...values, existing[0].id]
        );
        return existing[0].id;
    }

    const id = uuid();
    await pool.query(
        `
        INSERT INTO salaryServiceRates (
            id, serviceId, employeeId, payMode, amountType, regularRate,
            nightRate, holidayRate, extraRate, fixedAmount, tierRules, notes, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, payload.serviceId, employeeId, ...values, userId]
    );
    return id;
};

const upsertSalaryPaidServiceHours = async ({ userId, payload }) => {
    const pool = await getPool();
    const hours = toNumber(payload.hours);

    const [existing] = await pool.query(
        `
        SELECT id
        FROM salaryPaidServiceHours
        WHERE employeeId = ?
          AND serviceId = ?
          AND settlementMonth = ?
          AND deletedAt IS NULL
        LIMIT 1
        `,
        [payload.employeeId, payload.serviceId, payload.settlementMonth]
    );

    if (existing.length) {
        await pool.query(
            `
            UPDATE salaryPaidServiceHours
            SET hours = ?, notes = ?, modifiedAt = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [hours, payload.notes || null, existing[0].id]
        );
        return existing[0].id;
    }

    const id = uuid();
    await pool.query(
        `
        INSERT INTO salaryPaidServiceHours (
            id, employeeId, serviceId, settlementMonth, hours, notes, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            payload.employeeId,
            payload.serviceId,
            payload.settlementMonth,
            hours,
            payload.notes || null,
            userId,
        ]
    );
    return id;
};

const createSalaryAdjustment = async ({ userId, payload }) => {
    const pool = await getPool();
    const amount = payload.amount !== undefined && payload.amount !== null && payload.amount !== ''
        ? toNumber(payload.amount)
        : toNumber(payload.quantity) * toNumber(payload.unitRate);
    const id = uuid();

    await pool.query(
        `
        INSERT INTO salarySettlementAdjustments (
            id, employeeId, serviceId, settlementMonth, concept, quantity,
            unitRate, amount, amountType, notes, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            payload.employeeId,
            payload.serviceId || null,
            payload.settlementMonth,
            payload.concept,
            toNumber(payload.quantity) || 1,
            toNumber(payload.unitRate),
            roundMoney(amount),
            payload.amountType || 'gross',
            payload.notes || null,
            userId,
        ]
    );
    return id;
};

const upsertSalaryAbsencePayment = async ({ userId, payload }) => {
    const pool = await getPool();
    const absenceType = payload.absenceType;
    const amountType = payload.amountType || 'gross';
    const days = toNumber(payload.days);
    const amount = roundMoney(payload.amount);

    const [existing] = await pool.query(
        `
        SELECT id
        FROM salaryAbsencePayments
        WHERE employeeId = ?
          AND settlementMonth = ?
          AND absenceType = ?
          AND deletedAt IS NULL
        LIMIT 1
        `,
        [payload.employeeId, payload.settlementMonth, absenceType]
    );

    if (existing.length) {
        await pool.query(
            `
            UPDATE salaryAbsencePayments
            SET days = ?, amount = ?, amountType = ?, notes = ?
            WHERE id = ?
            `,
            [days, amount, amountType, payload.notes || null, existing[0].id]
        );
        return existing[0].id;
    }

    const id = uuid();
    await pool.query(
        `
        INSERT INTO salaryAbsencePayments (
            id, employeeId, settlementMonth, absenceType, days, amount,
            amountType, notes, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            payload.employeeId,
            payload.settlementMonth,
            absenceType,
            days,
            amount,
            amountType,
            payload.notes || null,
            userId,
        ]
    );
    return id;
};

const deleteSalaryAdjustment = async (adjustmentId) => {
    const pool = await getPool();
    await pool.query(
        'UPDATE salarySettlementAdjustments SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [adjustmentId]
    );
};

const calculateSalarySettlements = async ({
    viewerId,
    viewerRole,
    month,
    employeeId = '',
    serviceId = '',
    delegation = '',
    generateExcel = false,
}) => {
    const pool = await getPool();
    const { start, end } = getMonthRange(month);
    const filterData = await buildSalaryFilters({
        viewerId,
        viewerRole,
        start,
        end,
        employeeId,
        serviceId,
        delegation,
    });

    if (!filterData) {
        return {
            month,
            employees: [],
            workerOptions: [],
            serviceOptions: [],
            delegationOptions: [],
            rates: [],
            adjustments: [],
            agreement: getAgreementDefaults(month),
        };
    }

    const [shiftRows] = await pool.query(
        `
        SELECT
            ss.employeeId,
            ss.serviceId,
            u.firstName,
            u.lastName,
            u.dni,
            u.city AS employeeDelegation,
            ed.bankAccount,
            s.name AS serviceName,
            s.type AS serviceType,
            s.province AS serviceDelegation,
            s.hourRuleType,
            COUNT(*) AS shiftCount,
            COALESCE(SUM(CASE WHEN COALESCE(ss.realHours, 0) > 0 THEN ss.realHours ELSE ss.hours END), 0) AS totalHours,
            COALESCE(SUM(ss.nightHours), 0) AS nightHours,
            COALESCE(SUM(ss.holidayHours), 0) AS holidayHours
        FROM serviceScheduleShifts ss
        INNER JOIN users u ON u.id = ss.employeeId
        INNER JOIN services s ON s.id = ss.serviceId
        LEFT JOIN employeeDocumentations ed ON ed.userId = u.id
        WHERE ${filterData.filters.join(' AND ')}
        GROUP BY ss.employeeId, ss.serviceId, u.firstName, u.lastName, u.dni,
                 u.city, ed.bankAccount, s.name, s.type, s.province, s.hourRuleType
        ORDER BY u.firstName, u.lastName, s.name
        `,
        filterData.values
    );

    const [calendarRows] = await pool.query(
        `
        SELECT
            ss.employeeId,
            ss.serviceId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            COALESCE(CASE WHEN COALESCE(ss.realHours, 0) > 0 THEN ss.realHours ELSE ss.hours END, 0) AS hours,
            COALESCE(ss.nightHours, 0) AS nightHours,
            COALESCE(ss.holidayHours, 0) AS holidayHours,
            s.name AS serviceName,
            s.type AS serviceType
        FROM serviceScheduleShifts ss
        INNER JOIN users u ON u.id = ss.employeeId
        INNER JOIN services s ON s.id = ss.serviceId
        WHERE ${filterData.filters.join(' AND ')}
        ORDER BY ss.employeeId, ss.scheduleDate, ss.startTime
        `,
        filterData.values
    );

    const absenceValues = [end, start];
    const absenceFilters = [
        'ea.startDate <= ?',
        'ea.endDate >= ?',
    ];
    if (employeeId) {
        absenceFilters.push('ea.employeeId = ?');
        absenceValues.push(employeeId);
    }
    if (delegation) {
        absenceFilters.push('u.city = ?');
        absenceValues.push(delegation);
    }
    if (viewerRole === 'admin') {
        const delegations = await getViewerDelegations({ viewerId, viewerRole });
        if (delegations.length) {
            absenceFilters.push(`u.city IN (${delegations.map(() => '?').join(', ')})`);
            absenceValues.push(...delegations);
        }
    }

    const [absenceRows] = serviceId
        ? [[]]
        : await pool.query(
              `
              SELECT ea.id, ea.employeeId, ea.startDate, ea.endDate, ea.type, ea.notes,
                     u.firstName, u.lastName, u.dni, u.city AS employeeDelegation,
                     ed.bankAccount
              FROM employeeAbsences ea
              INNER JOIN users u ON u.id = ea.employeeId
              LEFT JOIN employeeDocumentations ed ON ed.userId = u.id
              WHERE ${absenceFilters.join(' AND ')}
              ORDER BY u.firstName, u.lastName, ea.startDate
              `,
              absenceValues
          );

    const employeeIds = [...new Set(shiftRows.map((row) => row.employeeId))];
    absenceRows.forEach((row) => {
        if (!employeeIds.includes(row.employeeId)) employeeIds.push(row.employeeId);
    });
    const serviceIds = [...new Set(shiftRows.map((row) => row.serviceId))];

    const rateRows = serviceIds.length
        ? await pool
              .query(
                  `
                  SELECT *
                  FROM salaryServiceRates
                  WHERE deletedAt IS NULL
                    AND serviceId IN (${serviceIds.map(() => '?').join(', ')})
                    AND (employeeId IS NULL ${
                        employeeIds.length
                            ? `OR employeeId IN (${employeeIds.map(() => '?').join(', ')})`
                            : ''
                    })
                  `,
                  [...serviceIds, ...employeeIds]
              )
              .then(([rows]) => rows)
        : [];
    const rateMap = buildRateMap(rateRows);

    const adjustmentValues = [month];
    let adjustmentFilter = 'a.settlementMonth = ? AND a.deletedAt IS NULL';
    if (employeeId) {
        adjustmentFilter += ' AND a.employeeId = ?';
        adjustmentValues.push(employeeId);
    }
    if (serviceId) {
        adjustmentFilter += ' AND (a.serviceId = ? OR a.serviceId IS NULL)';
        adjustmentValues.push(serviceId);
    }
    if (delegation) {
        adjustmentFilter += ' AND (u.city = ? OR s.province = ? OR a.serviceId IS NULL)';
        adjustmentValues.push(delegation, delegation);
    }
    if (viewerRole === 'admin') {
        const delegations = await getViewerDelegations({ viewerId, viewerRole });
        adjustmentFilter += ` AND (u.city IN (${delegations.map(() => '?').join(', ')}) OR s.province IN (${delegations.map(() => '?').join(', ')}))`;
        adjustmentValues.push(...delegations, ...delegations);
    }

    const [adjustments] = await pool.query(
        `
        SELECT a.*, s.name AS serviceName,
               u.firstName, u.lastName, u.dni, u.city AS employeeDelegation,
               ed.bankAccount
        FROM salarySettlementAdjustments a
        INNER JOIN users u ON u.id = a.employeeId
        LEFT JOIN employeeDocumentations ed ON ed.userId = u.id
        LEFT JOIN services s ON s.id = a.serviceId
        WHERE ${adjustmentFilter}
        ORDER BY a.createdAt DESC
        `,
        adjustmentValues
    );

    const paymentValues = [month];
    const paymentFilters = ['sap.settlementMonth = ?', 'sap.deletedAt IS NULL'];
    if (employeeIds.length) {
        paymentFilters.push(`sap.employeeId IN (${employeeIds.map(() => '?').join(', ')})`);
        paymentValues.push(...employeeIds);
    } else {
        paymentFilters.push('1 = 0');
    }

    const [absencePayments] = await pool.query(
        `
        SELECT sap.*
        FROM salaryAbsencePayments sap
        WHERE ${paymentFilters.join(' AND ')}
        `,
        paymentValues
    );

    const paidHourValues = [month];
    const paidHourFilters = ['sph.settlementMonth = ?', 'sph.deletedAt IS NULL'];
    if (employeeIds.length) {
        paidHourFilters.push(`sph.employeeId IN (${employeeIds.map(() => '?').join(', ')})`);
        paidHourValues.push(...employeeIds);
    } else {
        paidHourFilters.push('1 = 0');
    }
    if (serviceId) {
        paidHourFilters.push('sph.serviceId = ?');
        paidHourValues.push(serviceId);
    }

    const [paidHourRows] = await pool.query(
        `
        SELECT sph.*
        FROM salaryPaidServiceHours sph
        WHERE ${paidHourFilters.join(' AND ')}
        `,
        paidHourValues
    );

    const agreementDefaults = getAgreementDefaults(month);
    const employeeMonthHours = shiftRows.reduce((acc, row) => {
        acc.set(row.employeeId, toNumber(acc.get(row.employeeId)) + toNumber(row.totalHours));
        return acc;
    }, new Map());
    const employeeCalendar = calendarRows.reduce((acc, row) => {
        if (!acc.has(row.employeeId)) acc.set(row.employeeId, []);
        acc.get(row.employeeId).push({
            date: row.scheduleDate,
            serviceId: row.serviceId,
            serviceName: row.serviceName || row.serviceType || '',
            startTime: row.startTime,
            endTime: row.endTime,
            hours: toNumber(row.hours),
            nightHours: toNumber(row.nightHours),
            holidayHours: toNumber(row.holidayHours),
        });
        return acc;
    }, new Map());
    const absencePaymentMap = absencePayments.reduce((acc, row) => {
        acc.set(`${row.employeeId}:${row.absenceType}`, {
            ...row,
            days: toNumber(row.days),
            amount: toNumber(row.amount),
        });
        return acc;
    }, new Map());
    const paidHourMap = paidHourRows.reduce((acc, row) => {
        acc.set(`${row.employeeId}:${row.serviceId}`, {
            ...row,
            hours: toNumber(row.hours),
        });
        return acc;
    }, new Map());

    const employeeMap = new Map();
    const ensureEmployee = (row) => {
        if (!employeeMap.has(row.employeeId)) {
            employeeMap.set(row.employeeId, {
                employeeId: row.employeeId,
                employeeName:
                    row.employeeName ||
                    `${row.firstName || ''} ${row.lastName || ''}`.trim(),
                dni: row.dni || '',
                delegation: row.employeeDelegation || '',
                bankAccount: row.bankAccount || '',
                totalHours: 0,
                paidHours: 0,
                payableHours: 0,
                baseHours: 0,
                nightHours: 0,
                holidayHours: 0,
                extraHours: 0,
                grossAmount: 0,
                netAmount: 0,
                missingRates: 0,
                services: [],
                adjustments: [],
                absences: [],
                absencePayments: [],
                calendar: employeeCalendar.get(row.employeeId) || [],
            });
        }
        return employeeMap.get(row.employeeId);
    };

    shiftRows.forEach((row) => {
        const exactRate = rateMap.get(getRateKey(row.serviceId, row.employeeId));
        const defaultRate = rateMap.get(getRateKey(row.serviceId, ''));
        const rate = exactRate || defaultRate || normalizeRate(null);
        const totalHours = toNumber(row.totalHours);
        const nightHours = toNumber(row.nightHours);
        const holidayHours = toNumber(row.holidayHours);
        const paidRecord = paidHourMap.get(`${row.employeeId}:${row.serviceId}`);
        const paidHours = Math.min(toNumber(paidRecord?.hours), totalHours);
        const payableHours = Math.max(totalHours - paidHours, 0);
        const rawBaseHours = Math.max(totalHours - nightHours - holidayHours, 0);
        const employeeTotalHours = toNumber(employeeMonthHours.get(row.employeeId));
        const employeeExtraHours = Math.max(
            employeeTotalHours - agreementDefaults.monthlyRegularHours,
            0
        );
        const extraHours =
            rate.payMode === 'agreement' && employeeTotalHours > 0
                ? roundMoney((employeeExtraHours * totalHours) / employeeTotalHours)
                : 0;
        const baseHours =
            rate.payMode === 'agreement'
                ? Math.max(rawBaseHours - extraHours, 0)
                : rawBaseHours;
        const fullRow = { ...row, baseHours, extraHours, totalHours };
        const enrichedRow = scaleRowHours(fullRow, payableHours);
        const payment = calculateLinePayment({ row: enrichedRow, rate, month });
        const amount = payment.amount;
        const amountType = payment.amountType;

        const employee = ensureEmployee(row);
        employee.totalHours += totalHours;
        employee.paidHours += paidHours;
        employee.payableHours += payableHours;
        employee.baseHours += enrichedRow.baseHours;
        employee.nightHours += enrichedRow.nightHours;
        employee.holidayHours += enrichedRow.holidayHours;
        employee.extraHours += enrichedRow.extraHours;
        if (!rate.id) employee.missingRates += 1;
        if (payment.grossAmount !== undefined || payment.netAmount !== undefined) {
            employee.grossAmount += toNumber(payment.grossAmount);
            employee.netAmount += toNumber(payment.netAmount);
        } else if (amountType === 'net') employee.netAmount += amount;
        else employee.grossAmount += amount;
        employee.services.push({
            serviceId: row.serviceId,
            serviceName: row.serviceName || row.serviceType || '',
            serviceDelegation: row.serviceDelegation || '',
            hourRuleType: row.hourRuleType || 'standard',
            shiftCount: Number(row.shiftCount) || 0,
            totalHours,
            paidHours,
            payableHours,
            paidHoursNotes: paidRecord?.notes || '',
            baseHours: enrichedRow.baseHours,
            nightHours: enrichedRow.nightHours,
            holidayHours: enrichedRow.holidayHours,
            extraHours: enrichedRow.extraHours,
            rate,
            amount,
            amountType,
            tierBreakdown: payment.tierBreakdown,
        });
    });

    absenceRows.forEach((absence) => {
        const employee = ensureEmployee(absence);
        employee.absences.push({
            id: absence.id,
            type: absence.type,
            startDate: getDateKey(absence.startDate),
            endDate: getDateKey(absence.endDate),
            days: countOverlapDays(absence.startDate, absence.endDate, start, end),
            notes: absence.notes || '',
        });
    });

    employeeMap.forEach((employee) => {
        ['vacation', 'sick'].forEach((type) => {
            const detectedDays = employee.absences
                .filter((absence) => absence.type === type)
                .reduce((sum, absence) => sum + absence.days, 0);
            const savedPayment = absencePaymentMap.get(`${employee.employeeId}:${type}`);
            const payment = {
                id: savedPayment?.id || '',
                absenceType: type,
                detectedDays: roundMoney(detectedDays),
                days:
                    savedPayment?.days !== undefined
                        ? roundMoney(savedPayment.days)
                        : roundMoney(detectedDays),
                amount: savedPayment ? roundMoney(savedPayment.amount) : 0,
                amountType: savedPayment?.amountType || 'gross',
                notes: savedPayment?.notes || '',
            };
            employee.absencePayments.push(payment);
            if (payment.amountType === 'net') employee.netAmount += payment.amount;
            else employee.grossAmount += payment.amount;
        });
    });

    adjustments.forEach((adjustment) => {
        const employee = ensureEmployee({
            ...adjustment,
            employeeName:
                `${adjustment.firstName || ''} ${adjustment.lastName || ''}`.trim(),
        });
        const amount = toNumber(adjustment.amount);
        if (adjustment.amountType === 'net') employee.netAmount += amount;
        else employee.grossAmount += amount;
        employee.adjustments.push({
            ...adjustment,
            quantity: toNumber(adjustment.quantity),
            unitRate: toNumber(adjustment.unitRate),
            amount,
        });
    });

    const employees = [...employeeMap.values()].map((employee) => ({
        ...employee,
        totalHours: roundMoney(employee.totalHours),
        paidHours: roundMoney(employee.paidHours),
        payableHours: roundMoney(employee.payableHours),
        baseHours: roundMoney(employee.baseHours),
        nightHours: roundMoney(employee.nightHours),
        holidayHours: roundMoney(employee.holidayHours),
        extraHours: roundMoney(employee.extraHours),
        grossAmount: roundMoney(employee.grossAmount),
        netAmount: roundMoney(employee.netAmount),
        totalAmount: roundMoney(employee.grossAmount + employee.netAmount),
    }));

    const options = await listSalaryOptions({
        viewerId,
        viewerRole,
        month,
        employeeId,
        serviceId,
        delegation,
    });
    const visibleServices = await listVisibleServices({ viewerId, viewerRole });
    const visibleServiceIds = visibleServices.map((service) => service.id);
    const allRates = visibleServiceIds.length
        ? await listSalaryRatesForServices(visibleServiceIds)
        : [];

    if (!generateExcel) {
        return {
            month,
            employees,
            workerOptions: options.employees,
            serviceOptions: options.services,
            delegationOptions: options.delegations,
            rates: allRates,
            adjustments,
            agreement: agreementDefaults,
        };
    }

    const summaryRows = employees.map((employee) => ({
        delegation: employee.delegation,
        dni: employee.dni,
        employeeName: employee.employeeName,
        bankAccount: employee.bankAccount,
        totalHours: employee.totalHours,
        paidHours: employee.paidHours,
        payableHours: employee.payableHours,
        baseHours: employee.baseHours,
        nightHours: employee.nightHours,
        holidayHours: employee.holidayHours,
        extraHours: employee.extraHours,
        grossAmount: employee.grossAmount,
        netAmount: employee.netAmount,
        totalAmount: employee.totalAmount,
        missingRates: employee.missingRates,
        vacationDays:
            employee.absencePayments.find((item) => item.absenceType === 'vacation')
                ?.days || 0,
        vacationAmount:
            employee.absencePayments.find((item) => item.absenceType === 'vacation')
                ?.amount || 0,
        sickDays:
            employee.absencePayments.find((item) => item.absenceType === 'sick')
                ?.days || 0,
        sickAmount:
            employee.absencePayments.find((item) => item.absenceType === 'sick')
                ?.amount || 0,
    }));

    const detailRows = employees.flatMap((employee) =>
        employee.services.map((service) => ({
            employeeName: employee.employeeName,
            dni: employee.dni,
            serviceName: service.serviceName,
            serviceDelegation: service.serviceDelegation,
            hourRuleType: service.hourRuleType,
            totalHours: service.totalHours,
            paidHours: service.paidHours,
            payableHours: service.payableHours,
            baseHours: service.baseHours,
            nightHours: service.nightHours,
            holidayHours: service.holidayHours,
            extraHours: service.extraHours,
            amountType: service.amountType === 'net' ? 'Neto' : 'Bruto',
            payMode:
                service.rate.payMode === 'agreement'
                    ? 'Convenio'
                    : service.rate.payMode === 'fixed'
                      ? 'Fijo'
                      : 'Por horas',
            regularRate: service.rate.regularRate,
            nightRate:
                service.rate.payMode === 'agreement' && !service.rate.nightRate
                    ? agreementDefaults.nightRate
                    : service.rate.nightRate,
            holidayRate:
                service.rate.payMode === 'agreement' && !service.rate.holidayRate
                    ? agreementDefaults.holidayRate
                    : service.rate.holidayRate,
            extraRate: service.rate.extraRate,
            fixedAmount: service.rate.fixedAmount,
            tierRules: service.rate.tierRules?.length
                ? service.rate.tierRules
                      .map(
                          (rule) =>
                              `Desde ${rule.fromHour}h hasta ${rule.toHour || 'final'}h: ${rule.amountType === 'net' ? 'neto' : 'bruto'} ${rule.regularRate}/h`
                      )
                      .join(' | ')
                : '',
            paidHoursNotes: service.paidHoursNotes || '',
            amount: service.amount,
        }))
    );

    const adjustmentRows = adjustments.map((adjustment) => ({
        employeeId: adjustment.employeeId,
        serviceName: adjustment.serviceName || '',
        concept: adjustment.concept,
        quantity: toNumber(adjustment.quantity),
        unitRate: toNumber(adjustment.unitRate),
        amountType: adjustment.amountType === 'net' ? 'Neto' : 'Bruto',
        amount: toNumber(adjustment.amount),
        notes: adjustment.notes || '',
    }));

    const filePath = await createExcelUtil(
        [
            {
                name: 'Resumen sueldos',
                columns: [
                    { header: 'Delegacion', key: 'delegation', width: 18 },
                    { header: 'DNI', key: 'dni', width: 16 },
                    { header: 'Trabajador', key: 'employeeName', width: 30 },
                    { header: 'Cuenta bancaria', key: 'bankAccount', width: 28 },
                    { header: 'Horas', key: 'totalHours', width: 12 },
                    { header: 'Horas ya pagadas', key: 'paidHours', width: 18 },
                    { header: 'Horas a pagar', key: 'payableHours', width: 16 },
                    { header: 'Base', key: 'baseHours', width: 12 },
                    { header: 'Nocturnas', key: 'nightHours', width: 12 },
                    { header: 'Festivas', key: 'holidayHours', width: 12 },
                    { header: 'Extras', key: 'extraHours', width: 12 },
                    { header: 'Bruto', key: 'grossAmount', width: 12 },
                    { header: 'Neto', key: 'netAmount', width: 12 },
                    { header: 'Total', key: 'totalAmount', width: 12 },
                    { header: 'Dias vacaciones', key: 'vacationDays', width: 16 },
                    { header: 'Importe vacaciones', key: 'vacationAmount', width: 18 },
                    { header: 'Dias baja', key: 'sickDays', width: 12 },
                    { header: 'Importe baja', key: 'sickAmount', width: 14 },
                    { header: 'Servicios sin tarifa', key: 'missingRates', width: 18 },
                ],
                rows: summaryRows,
            },
            {
                name: 'Detalle servicios',
                columns: [
                    { header: 'Trabajador', key: 'employeeName', width: 30 },
                    { header: 'DNI', key: 'dni', width: 16 },
                    { header: 'Servicio', key: 'serviceName', width: 32 },
                    { header: 'Delegacion servicio', key: 'serviceDelegation', width: 20 },
                    { header: 'Regla', key: 'hourRuleType', width: 12 },
                    { header: 'Horas', key: 'totalHours', width: 12 },
                    { header: 'Horas ya pagadas', key: 'paidHours', width: 18 },
                    { header: 'Horas a pagar', key: 'payableHours', width: 16 },
                    { header: 'Base', key: 'baseHours', width: 12 },
                    { header: 'Nocturnas', key: 'nightHours', width: 12 },
                    { header: 'Festivas', key: 'holidayHours', width: 12 },
                    { header: 'Extras', key: 'extraHours', width: 12 },
                    { header: 'Modo', key: 'payMode', width: 12 },
                    { header: 'Tipo', key: 'amountType', width: 10 },
                    { header: 'Precio base', key: 'regularRate', width: 12 },
                    { header: 'Precio nocturna', key: 'nightRate', width: 14 },
                    { header: 'Precio festiva', key: 'holidayRate', width: 14 },
                    { header: 'Precio extra', key: 'extraRate', width: 12 },
                    { header: 'Fijo', key: 'fixedAmount', width: 12 },
                    { header: 'Tramos', key: 'tierRules', width: 46 },
                    { header: 'Notas horas pagadas', key: 'paidHoursNotes', width: 36 },
                    { header: 'Importe', key: 'amount', width: 12 },
                ],
                rows: detailRows,
            },
            {
                name: 'Ajustes',
                columns: [
                    { header: 'Trabajador ID', key: 'employeeId', width: 38 },
                    { header: 'Servicio', key: 'serviceName', width: 32 },
                    { header: 'Concepto', key: 'concept', width: 28 },
                    { header: 'Cantidad', key: 'quantity', width: 12 },
                    { header: 'Precio unidad', key: 'unitRate', width: 14 },
                    { header: 'Tipo', key: 'amountType', width: 10 },
                    { header: 'Importe', key: 'amount', width: 12 },
                    { header: 'Notas', key: 'notes', width: 40 },
                ],
                rows: adjustmentRows,
            },
        ],
        null,
        `sueldos-${month}.xlsx`
    );

    return {
        month,
        employees,
        workerOptions: options.employees,
        serviceOptions: options.services,
        delegationOptions: options.delegations,
        rates: allRates,
        adjustments,
        agreement: agreementDefaults,
        excelFilePath: `/uploads/documents/${path.basename(filePath)}`,
    };
};

export {
    calculateSalarySettlements,
    createSalaryAdjustment,
    deleteSalaryAdjustment,
    listSalaryOptions,
    listSalaryRates,
    upsertSalaryAbsencePayment,
    upsertSalaryPaidServiceHours,
    upsertSalaryRate,
};
