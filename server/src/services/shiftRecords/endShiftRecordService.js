import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const endShiftRecordService = async (
    shiftRecordId,
    employeeId,
    location,
    endDateTime,
    serviceId
) => {
    const pool = await getPool();
    if (!Array.isArray(location) || location.length < 2) {
        generateErrorUtil('Ubicacion invalida', 400);
    }

    const [latitudeOut, longitudeOut] = location;

    // 1) Buscar el turno del empleado (si esta abierto, lo cerramos)
    const [rows] = await pool.query(
        `
      SELECT id, serviceId, clockOut
      FROM shiftRecords
      WHERE id = ? AND employeeId = ?
      LIMIT 1
    `,
        [shiftRecordId, employeeId]
    );

    if (rows.length === 0) {
        generateErrorUtil('Debes fichar la entrada primero', 401);
        return;
    }

    const shift = rows[0];

    if (shift.clockOut) {
        generateErrorUtil('Ya has registrado una hora de fin', 401);
        return;
    }

    const [reportRows] = await pool.query(
        `
      SELECT id FROM workReports WHERE shiftRecordId = ? LIMIT 1
    `,
        [shiftRecordId]
    );

    if (reportRows.length === 0) {
        generateErrorUtil(
            'Debes enviar el parte antes de finalizar el turno',
            401
        );
        return;
    }

    const shiftId = shift.id;

    // 2) Cerrar el turno. La condición "AND clockOut IS NULL" evita carreras:
    const [result] = await pool.query(
        `
      UPDATE shiftRecords
      SET
        clockOut = ?,
        realClockOut = COALESCE(realClockOut, UTC_TIMESTAMP()),
        latitudeOut = ?,
        longitudeOut = ?
      WHERE id = ? AND clockOut IS NULL
    `,
        [endDateTime, latitudeOut, longitudeOut, shiftId]
    );

    if (result.affectedRows === 0) {
        generateErrorUtil('Ya has registrado una hora de fin', 401);
        return;
    }

    // 3) Marcar el servicio como completado (si aplica a tu lógica de negocio)
    return;

};

export default endShiftRecordService;
