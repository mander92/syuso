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

    if (!clockOut) {
        const [openRows] = await pool.query(
            `
            SELECT sr.id, s.name AS serviceName
            FROM shiftRecords sr
            INNER JOIN services s ON s.id = sr.serviceId
            WHERE sr.employeeId = ?
              AND sr.clockOut IS NULL
              AND sr.deletedAt IS NULL
            ORDER BY sr.createdAt DESC
            LIMIT 1
            `,
            [employeeId]
        );

        if (openRows.length) {
            generateErrorUtil(
                `El trabajador ya tiene un turno abierto en ${openRows[0].serviceName || 'otro servicio'}. Cierralo antes de abrir otro.`,
                409
            );
        }
    }

    const [created] = await pool.query(
        `
        SELECT id FROM shiftRecords WHERE serviceId = ? AND employeeId = ? 
        `,
        [serviceId, employeeId]
    );

    if (created.length) generateErrorUtil('El turno ya está asignado', 401);

    const id = uuid();

    try {
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
    } catch (error) {
        if (
            error?.code === 'ER_DUP_ENTRY' &&
            String(error?.message || '').includes('uniq_shift_open_employee')
        ) {
            generateErrorUtil(
                'El trabajador ya tiene un turno abierto. Cierralo antes de abrir otro.',
                409
            );
        }
        throw error;
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
