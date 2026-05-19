import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { normalizeEmployeeRequestType } from './employeeRequestTypes.js';

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const createEmployeeRequestService = async ({
    employeeId,
    requestType,
    startDate,
    endDate,
    notes,
}) => {
    const pool = await getPool();
    const type = normalizeEmployeeRequestType(requestType);
    const allowedTypes = ['vacation', 'days_off', 'weekend_rest', 'availability'];

    if (!allowedTypes.includes(type)) {
        generateErrorUtil('Tipo de peticion no valido', 400);
    }

    if (!isDateString(startDate) || !isDateString(endDate)) {
        generateErrorUtil('Indica fecha de inicio y fin en formato YYYY-MM-DD', 400);
    }

    if (startDate > endDate) {
        generateErrorUtil('La fecha de inicio no puede ser posterior a la de fin', 400);
    }

    const id = uuid();

    await pool.query(
        `
        INSERT INTO employeeRequests
            (id, employeeId, requestType, startDate, endDate, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, employeeId, type, startDate, endDate, notes || null]
    );

    return {
        id,
        employeeId,
        requestType: type,
        startDate,
        endDate,
        notes: notes || null,
        status: 'pending',
    };
};

export default createEmployeeRequestService;
