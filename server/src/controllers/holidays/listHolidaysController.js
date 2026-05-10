import getPool from '../../db/getPool.js';

const listHolidaysController = async (req, res, next) => {
    try {
        const {
            year,
            scope,
            autonomousCommunity,
            province,
            city,
        } = req.query;
        const pool = await getPool();
        const filters = ['deletedAt IS NULL'];
        const values = [];

        if (year) {
            filters.push('YEAR(holidayDate) = ?');
            values.push(Number(year));
        }
        if (scope) {
            filters.push('scope = ?');
            values.push(scope);
        }
        if (autonomousCommunity) {
            filters.push('autonomousCommunity = ?');
            values.push(autonomousCommunity);
        }
        if (province) {
            filters.push('province = ?');
            values.push(province);
        }
        if (city) {
            filters.push('city = ?');
            values.push(city);
        }

        const [rows] = await pool.query(
            `
            SELECT id, holidayDate, name, scope, autonomousCommunity, province, city
            FROM holidays
            WHERE ${filters.join(' AND ')}
            ORDER BY holidayDate ASC, scope ASC, name ASC
            `,
            values
        );

        res.send({ status: 'ok', data: rows });
    } catch (error) {
        next(error);
    }
};

export default listHolidaysController;
