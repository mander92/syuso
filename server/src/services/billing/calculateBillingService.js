import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const normalizeVatPercent = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 21;
    return number;
};

const calculateBillingService = async ({
    serviceId,
    periodStart,
    periodEnd,
    concept,
    vatPercent,
}) => {
    const pool = await getPool();

    const [services] = await pool.query(
        `
        SELECT
            s.id,
            s.name,
            s.hourlyRate,
            s.clientId,
            CONCAT_WS(' ', u.firstName, u.lastName) AS clientName,
            u.email AS clientEmail
        FROM services s
        LEFT JOIN users u ON u.id = s.clientId
        WHERE s.id = ?
          AND s.deletedAt IS NULL
        `,
        [serviceId]
    );

    if (!services.length) generateErrorUtil('Servicio no encontrado', 404);

    const [totals] = await pool.query(
        `
        SELECT COALESCE(SUM(CASE
            WHEN COALESCE(realHours, 0) > 0 THEN realHours
            ELSE COALESCE(hours, 0)
        END), 0) AS totalHours
        FROM serviceScheduleShifts
        WHERE serviceId = ?
          AND deletedAt IS NULL
          AND scheduleDate BETWEEN ? AND ?
        `,
        [serviceId, periodStart, periodEnd]
    );

    const service = services[0];
    const totalHours = Number(totals[0]?.totalHours) || 0;
    const hourlyRate = Number(service.hourlyRate) || 0;
    const subtotal = Number((totalHours * hourlyRate).toFixed(2));
    const normalizedVatPercent = normalizeVatPercent(vatPercent);
    const vatAmount = Number(((subtotal * normalizedVatPercent) / 100).toFixed(2));
    const amount = Number((subtotal + vatAmount).toFixed(2));

    return {
        service,
        concept: concept || service.name,
        periodStart,
        periodEnd,
        totalHours,
        hourlyRate,
        subtotal,
        vatPercent: normalizedVatPercent,
        vatAmount,
        amount,
    };
};

export default calculateBillingService;
