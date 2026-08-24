import getPool from '../../db/getPool.js';

const editShiftRecordsService = async (clockIn, clockOut, shiftRecordId) => {
    const pool = await getPool();

    await pool.query(
        `
        UPDATE shiftRecords
        SET clockIn = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            clockOut = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            realClockIn = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
            realClockOut = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s')
        WHERE id = ?
        `,
        [clockIn, clockOut, clockIn, clockOut, shiftRecordId]
    );
};

export default editShiftRecordsService;
