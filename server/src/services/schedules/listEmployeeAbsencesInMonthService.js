import getPool from '../../db/getPool.js';

const getMonthBounds = (month) => {
    const [year, monthValue] = String(month || '').split('-').map(Number);
    if (!year || !monthValue) {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        return getMonthBounds(currentMonth);
    }

    const startDate = `${year}-${String(monthValue).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, monthValue, 0))
        .toISOString()
        .slice(0, 10);

    return { startDate, endDate };
};

const listEmployeeAbsencesInMonthService = async (employeeIds = [], month) => {
    const ids = [...new Set(employeeIds.filter(Boolean))];
    if (!ids.length) return [];

    const { startDate, endDate } = getMonthBounds(month);
    const pool = await getPool();
    const [rows] = await pool.query(
        `
        SELECT id, employeeId, startDate, endDate, type, notes
        FROM employeeAbsences
        WHERE employeeId IN (?)
          AND startDate <= ?
          AND endDate >= ?
        ORDER BY employeeId ASC, startDate ASC
        `,
        [ids, endDate, startDate]
    );

    return rows;
};

export default listEmployeeAbsencesInMonthService;
