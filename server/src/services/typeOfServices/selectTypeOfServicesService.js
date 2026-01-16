import getPool from '../../db/getPool.js';

const selectTypeOfServiceService = async (type, city) => {
    const pool = await getPool();

    let sqlQuery = ` SELECT 
      t.id, t.image, t.type, t.description, t.city
    FROM 
      typeOfServices t
    WHERE 
      t.deletedAt IS NULL`;

    let sqlValues = [];

    if (type) {
        sqlQuery += ' AND type = ?';
        sqlValues.push(type);
    }

    if (city) {
        sqlQuery += ' AND city = ?';
        sqlValues.push(city);
    }

    sqlQuery += ' ORDER BY t.modifiedAt DESC';

    const [service] = await pool.query(sqlQuery, sqlValues);

    return service;
};

export default selectTypeOfServiceService;
