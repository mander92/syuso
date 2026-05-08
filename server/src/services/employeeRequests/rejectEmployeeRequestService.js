import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const rejectEmployeeRequestService = async ({
    requestId,
    adminId,
    decisionNotes,
}) => {
    const pool = await getPool();

    const [requests] = await pool.query(
        'SELECT * FROM employeeRequests WHERE id = ?',
        [requestId]
    );

    if (!requests.length) generateErrorUtil('Peticion no encontrada', 404);
    const request = requests[0];

    if (request.status !== 'pending') {
        generateErrorUtil('La peticion ya fue resuelta', 409);
    }

    await pool.query(
        `
        UPDATE employeeRequests
        SET status = 'rejected',
            decidedBy = ?,
            decidedAt = NOW(),
            decisionNotes = ?
        WHERE id = ?
        `,
        [adminId, decisionNotes || null, requestId]
    );

    return {
        ...request,
        status: 'rejected',
        decidedBy: adminId,
        decidedAt: new Date(),
        decisionNotes: decisionNotes || null,
    };
};

export default rejectEmployeeRequestService;
