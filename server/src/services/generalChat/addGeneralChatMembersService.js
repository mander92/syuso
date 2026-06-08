import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const addGeneralChatMembersService = async (
    chatId,
    memberIds = [],
    requester,
    options = {}
) => {
    const pool = await getPool();
    const { id: requesterId, role } = requester;
    const { chatType = 'standard' } = options;

    if (role !== 'admin' && role !== 'sudo') {
        generateErrorUtil('No autorizado', 403);
    }

    const ids = Array.from(new Set([requesterId, ...(memberIds || [])]));

    if (!ids.length) {
        return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const [users] = await pool.query(
        `
        SELECT id, role, city
        FROM users
        WHERE id IN (${placeholders}) AND deletedAt IS NULL
        `,
        ids
    );

    const userMap = new Map(users.map((user) => [user.id, user]));

    if (userMap.size !== ids.length) {
        generateErrorUtil('Alguno de los usuarios no existe', 404);
    }

    let allowedDelegations = [];

    if (role === 'admin') {
        allowedDelegations = await selectAdminDelegationNamesService(
            requesterId
        );
        if (!allowedDelegations.length) {
            generateErrorUtil('Sin delegaciones asignadas', 403);
        }
    }

    if (chatType === 'direct') {
        for (const user of users) {
            if (user.id === requesterId) continue;

            if (!['employee', 'admin', 'sudo'].includes(user.role)) {
                generateErrorUtil(
                    'Usuario no valido para chat individual',
                    403
                );
            }

            if (
                role === 'admin' &&
                user.role === 'employee' &&
                !allowedDelegations.includes(user.city)
            ) {
                generateErrorUtil('Empleado fuera de tu delegacion', 403);
            }
        }
    }

    if (role === 'admin' && chatType !== 'direct') {
        for (const user of users) {
            if (user.id === requesterId) continue;

            if (user.role !== 'employee') {
                generateErrorUtil('Solo puedes agregar empleados', 403);
            }
            if (!allowedDelegations.includes(user.city)) {
                generateErrorUtil('Empleado fuera de tu delegacion', 403);
            }
        }
    }

    const values = ids.map((id) => [chatId, id]);

    await pool.query(
        `
        INSERT INTO generalChatMembers (chatId, userId)
        VALUES ${values.map(() => '(?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE chatId = chatId
        `,
        values.flat()
    );

    return ids;
};

export default addGeneralChatMembersService;
