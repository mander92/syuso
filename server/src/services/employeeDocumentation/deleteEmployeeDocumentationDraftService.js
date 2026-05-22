import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const countRows = async (pool, sql, values) => {
    const [rows] = await pool.query(sql, values);
    return Number(rows[0]?.total || 0);
};

const deleteEmployeeDocumentationDraftService = async (draftId) => {
    const pool = await getPool();

    const [draftRows] = await pool.query(
        `
            SELECT id, linkedUserId
            FROM employeeDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );

    const draft = draftRows[0];
    if (!draft) {
        generateErrorUtil('Alta de trabajador no encontrada', 404);
    }

    if (draft.linkedUserId) {
        const [userRows] = await pool.query(
            `
                SELECT id, role, deletedAt
                FROM users
                WHERE id = ?
            `,
            [draft.linkedUserId]
        );
        const user = userRows[0];

        if (user?.role === 'employee' && !user.deletedAt) {
            const relatedRecords =
                (await countRows(
                    pool,
                    'SELECT COUNT(*) AS total FROM personsAssigned WHERE employeeId = ?',
                    [draft.linkedUserId]
                )) +
                (await countRows(
                    pool,
                    `
                        SELECT COUNT(*) AS total
                        FROM serviceScheduleShifts
                        WHERE employeeId = ?
                          AND deletedAt IS NULL
                    `,
                    [draft.linkedUserId]
                )) +
                (await countRows(
                    pool,
                    `
                        SELECT COUNT(*) AS total
                        FROM shiftRecords
                        WHERE employeeId = ?
                          AND deletedAt IS NULL
                    `,
                    [draft.linkedUserId]
                ));

            if (relatedRecords > 0) {
                generateErrorUtil(
                    'No se puede borrar: el trabajador ya tiene servicios, turnos o fichajes asociados',
                    409
                );
            }

            await pool.query(
                `
                    DELETE FROM employeeDocumentations
                    WHERE userId = ?
                `,
                [draft.linkedUserId]
            );

            await pool.query(
                `
                    UPDATE users
                    SET
                        active = 0,
                        email = CONCAT('deleted+', id, '@deleted.local'),
                        dni = NULL,
                        deletedAt = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND role = 'employee'
                `,
                [draft.linkedUserId]
            );
        }
    }

    await pool.query(
        `
            DELETE FROM employeeDocumentationDraftTokens
            WHERE draftId = ?
        `,
        [draftId]
    );

    await pool.query(
        `
            DELETE FROM employeeDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );
};

export default deleteEmployeeDocumentationDraftService;
