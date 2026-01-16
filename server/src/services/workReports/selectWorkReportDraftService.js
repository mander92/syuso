import getPool from '../../db/getPool.js';

const selectWorkReportDraftService = async (shiftRecordId, employeeId) => {
    const pool = await getPool();

    const [rows] = await pool.query(
        `
        SELECT id, data, signaturePath, photoPaths
        FROM workReportDrafts
        WHERE shiftRecordId = ? AND employeeId = ?
        `,
        [shiftRecordId, employeeId]
    );

    if (!rows.length) return null;

    const draft = rows[0];
    const parseMaybeJson = (value, fallback) => {
        if (!value) return fallback;
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        return value;
    };

    return {
        id: draft.id,
        data: parseMaybeJson(draft.data, {}),
        signaturePath: draft.signaturePath,
        photoPaths: parseMaybeJson(draft.photoPaths, []),
    };
};

export default selectWorkReportDraftService;
