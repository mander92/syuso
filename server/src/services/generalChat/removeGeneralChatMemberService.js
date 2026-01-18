import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const removeGeneralChatMemberService = async (chatId, memberId, requester) => {
    const pool = await getPool();
    const { role } = requester;

    if (role !== 'admin' && role !== 'sudo') {
        generateErrorUtil('No autorizado', 403);
    }

    const [result] = await pool.query(
        `
        DELETE FROM generalChatMembers
        WHERE chatId = ? AND userId = ?
        `,
        [chatId, memberId]
    );

    return result.affectedRows || 0;
};

export default removeGeneralChatMemberService;
