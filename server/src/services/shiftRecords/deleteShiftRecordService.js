import getPool from '../../db/getPool.js';

const deleteShiftRecordService = async (shiftRecordId) => {
    const pool = await getPool();

    await pool.query(
        `
        DELETE FROM shiftRecords WHERE id = ?
        `,
        [shiftRecordId]
    );
};

export default deleteShiftRecordService;
