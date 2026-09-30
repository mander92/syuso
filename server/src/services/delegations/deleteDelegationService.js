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

    const [[serviceUsage]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM services
        WHERE province = ? AND deletedAt IS NULL
        `,
        [delegationName]
    );

    if (serviceUsage?.total) {
        generateErrorUtil(
            'No se puede eliminar: hay servicios asociados',
            409
        );
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [assignmentResult] = await connection.query(
            `
            DELETE FROM adminDelegations
            WHERE delegationId = ?
            `,
            [delegationId]
        );
        await connection.query(
            `
            DELETE FROM delegations
            WHERE id = ?
            `,
            [delegationId]
        );
        await connection.commit();
        return { unassignedUsers: assignmentResult.affectedRows || 0 };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export default deleteDelegationService;
