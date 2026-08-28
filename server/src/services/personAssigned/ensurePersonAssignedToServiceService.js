import Randomstring from 'randomstring';
import { v4 as uuid } from 'uuid';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensurePersonAssignedToServiceService = async (pool, employeeId, serviceId) => {
    if (!employeeId || !serviceId) return { assigned: false };

    const [users] = await pool.query(
        `
        SELECT id
        FROM users
        WHERE id = ?
          AND role = 'employee'
          AND active = 1
          AND deletedAt IS NULL
        LIMIT 1
        `,
        [employeeId]
    );
    if (!users.length) generateErrorUtil('Trabajador no encontrado', 404);

    const [existing] = await pool.query(
        `
        SELECT id
        FROM personsAssigned
        WHERE employeeId = ? AND serviceId = ?
        LIMIT 1
        `,
        [employeeId, serviceId]
    );

    if (existing.length) return { assigned: false, id: existing[0].id };

    const id = uuid();
    const pin = Randomstring.generate(4);
    await pool.query(
        `
        INSERT INTO personsAssigned(id, employeeId, serviceId, pin)
        VALUES (?, ?, ?, ?)
        `,
        [id, employeeId, serviceId, pin]
    );

    return { assigned: true, id };
};

export default ensurePersonAssignedToServiceService;
