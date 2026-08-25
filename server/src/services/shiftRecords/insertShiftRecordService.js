import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import createShiftRecordAuditLogService from './createShiftRecordAuditLogService.js';


const insertShiftRecordService = async (
    serviceId,
    employeeId,
    clockIn,
    clockOut,
    actor = {}
) => {
    const pool = await getPool();

    const [created] = await pool.query(
        `
        SELECT id FROM shiftRecords WHERE serviceId = ? AND employeeId = ? 
        `,
        [serviceId, employeeId]
    );

    if (created.length) generateErrorUtil('El turno ya está asignado', 401);

    const id = uuid();

    if (clockIn) {
        await pool.query(
            `
            INSERT INTO shiftRecords(
                id,
                employeeId,
                serviceId,
                clockIn,
                realClockIn,
                clockOut,
                realClockOut
            )
            VALUES(
                ?,
                ?,
                ?,
                STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
                STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
                STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'),
                STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s')
            )
            `,
            [id, employeeId, serviceId, clockIn, clockIn, clockOut, clockOut]
        );
    } else {
        await pool.query(
            `
            INSERT INTO shiftRecords(id, employeeId, serviceId) VALUES(?,?,?)
            `,
            [id, employeeId, serviceId]
        );
    }

    await createShiftRecordAuditLogService({
        shiftRecordId: id,
        employeeId,
        serviceId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: 'admin_create',
        source: 'admin_panel',
        reason: actor.reason || 'Creacion manual de fichaje',
        newValue: {
            id,
            employeeId,
            serviceId,
            clockIn: clockIn || null,
            clockOut: clockOut || null,
            realClockIn: clockIn || null,
            realClockOut: clockOut || null,
        },
        req: actor.req,
    });

    return id;
};

export default insertShiftRecordService;
