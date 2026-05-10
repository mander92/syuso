const selectHolidayAffectedServiceIdsService = async (pool, holiday) => {
    if (!pool || !holiday?.scope) return [];

    const filters = ['s.deletedAt IS NULL'];
    const values = [];

    if (holiday.scope === 'autonomous') {
        filters.push('COALESCE(s.autonomousCommunity, "") = COALESCE(?, "")');
        values.push(holiday.autonomousCommunity || null);
    }

    if (holiday.scope === 'local') {
        if (holiday.autonomousCommunity) {
            filters.push('s.autonomousCommunity = ?');
            values.push(holiday.autonomousCommunity);
        }
        if (holiday.province) {
            filters.push('s.province = ?');
            values.push(holiday.province);
        }
        if (holiday.city) {
            filters.push('a.city = ?');
            values.push(holiday.city);
        }
    }

    const [rows] = await pool.query(
        `
        SELECT s.id
        FROM services s
        LEFT JOIN addresses a ON a.id = s.addressId
        WHERE ${filters.join(' AND ')}
        `,
        values
    );

    return rows.map((row) => row.id).filter(Boolean);
};

export default selectHolidayAffectedServiceIdsService;
