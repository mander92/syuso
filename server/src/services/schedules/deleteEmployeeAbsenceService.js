import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteEmployeeAbsenceService = async (absenceId, employeeId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id
        FROM employeeAbsences
        WHERE id = ? AND employeeId = ?
        `,
        [absenceId, employeeId]
    );

    if (!rows.length) {
        generateErrorUtil('Ausencia no encontrada', 404);
    }

    await pool.query(
        `
        DELETE FROM employeeAbsences
        WHERE id = ? AND employeeId = ?
        `,
        [absenceId, employeeId]
    );

    return true;
};

export default deleteEmployeeAbsenceService;
