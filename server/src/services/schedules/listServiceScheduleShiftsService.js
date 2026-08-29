import getPool from '../../db/getPool.js';
import {
    listActiveScheduleRows,
    listScheduleSnapshotRows,
} from './serviceScheduleSnapshotService.js';

const listServiceScheduleShiftsService = async (serviceId, month) => {
    const pool = await getPool();

    const rows = await listActiveScheduleRows(pool, serviceId, month);
    if (rows.length || !month) return rows;

    const snapshotRows = await listScheduleSnapshotRows(pool, serviceId, month);
    if (snapshotRows.length) return snapshotRows;

    return [];
};

export default listServiceScheduleShiftsService;
