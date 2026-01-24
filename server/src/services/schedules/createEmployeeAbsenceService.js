import getPool from '../../db/getPool.js';
import { v4 as uuid } from 'uuid';

const createEmployeeAbsenceService = async (
    employeeId,
    startDate,
    endDate,
    type,
    notes,
    createdBy
) => {
    const pool = await getPool();
    const id = uuid();

    await pool.query(
        `
        INSERT INTO employeeAbsences
            (id, employeeId, startDate, endDate, type, notes, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            employeeId,
            startDate,
            endDate,
            type,
            notes || null,
            createdBy,
        ]
    );

    return {
        id,
        employeeId,
        startDate,
        endDate,
        type,
        notes: notes || null,
    };
};

export default createEmployeeAbsenceService;
