import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteDelegationService = async (delegationId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, name
        FROM delegations
        WHERE id = ?
        `,
        [delegationId]
    );

    if (!rows.length) {
        generateErrorUtil('Delegacion no encontrada', 404);
    }

    const delegationName = rows[0].name;

    const [[adminUsage]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM adminDelegations
        WHERE delegationId = ?
        `,
        [delegationId]
    );

    if (adminUsage?.total) {
        generateErrorUtil(
            'No se puede eliminar: hay admins asignados',
            409
        );
    }

    const [[serviceUsage]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM typeOfServices
        WHERE city = ? AND deletedAt IS NULL
        `,
        [delegationName]
    );

    if (serviceUsage?.total) {
        generateErrorUtil(
            'No se puede eliminar: hay servicios asociados',
            409
        );
    }

    await pool.query(
        `
        DELETE FROM delegations
        WHERE id = ?
        `,
        [delegationId]
    );
};

export default deleteDelegationService;
