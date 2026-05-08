import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { absenceTypeByRequestType } from './employeeRequestTypes.js';

const approveEmployeeRequestService = async ({
    requestId,
    adminId,
    decisionNotes,
}) => {
    const pool = await getPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [requests] = await conn.query(
            'SELECT * FROM employeeRequests WHERE id = ? FOR UPDATE',
            [requestId]
        );

        if (!requests.length) generateErrorUtil('Peticion no encontrada', 404);
        const request = requests[0];

        if (request.status !== 'pending') {
            generateErrorUtil('La peticion ya fue resuelta', 409);
        }

        const absenceType = absenceTypeByRequestType[request.requestType];
        let absenceId = null;

        if (absenceType) {
            absenceId = uuid();
            await conn.query(
                `
                INSERT INTO employeeAbsences
                    (id, employeeId, startDate, endDate, type, notes, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    absenceId,
                    request.employeeId,
                    request.startDate,
                    request.endDate,
                    absenceType,
                    request.notes || null,
                    adminId,
                ]
            );
        }

        await conn.query(
            `
            UPDATE employeeRequests
            SET status = 'approved',
                decidedBy = ?,
                decidedAt = NOW(),
                decisionNotes = ?,
                absenceId = ?
            WHERE id = ?
            `,
            [adminId, decisionNotes || null, absenceId, requestId]
        );

        await conn.commit();

        return {
            ...request,
            status: 'approved',
            decidedBy: adminId,
            decidedAt: new Date(),
            decisionNotes: decisionNotes || null,
            absenceId,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export default approveEmployeeRequestService;
