import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const deleteClientDocumentationDraftService = async (draftId) => {
    const pool = await getPool();

    const [draftRows] = await pool.query(
        `
            SELECT id, linkedClientId
            FROM clientDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );

    const draft = draftRows[0];
    if (!draft) {
        generateErrorUtil('Alta de cliente no encontrada', 404);
    }

    if (draft.linkedClientId) {
        const [serviceRows] = await pool.query(
            `
                SELECT COUNT(*) AS total
                FROM services
                WHERE clientId = ?
                  AND deletedAt IS NULL
            `,
            [draft.linkedClientId]
        );

        if (Number(serviceRows[0]?.total || 0) > 0) {
            generateErrorUtil(
                'No se puede borrar: el cliente tiene servicios asociados',
                409
            );
        }

        await pool.query(
            `
                DELETE FROM clientDocumentations
                WHERE clientId = ?
            `,
            [draft.linkedClientId]
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
                  AND role = 'client'
            `,
            [draft.linkedClientId]
        );
    }

    await pool.query(
        `
            DELETE FROM clientDocumentationDraftTokens
            WHERE draftId = ?
        `,
        [draftId]
    );

    await pool.query(
        `
            DELETE FROM clientDocumentationDrafts
            WHERE id = ?
        `,
        [draftId]
    );
};

export default deleteClientDocumentationDraftService;
