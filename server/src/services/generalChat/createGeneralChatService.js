import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import addGeneralChatMembersService from './addGeneralChatMembersService.js';

const createGeneralChatService = async (name, type, createdBy, memberIds, requester) => {
    const pool = await getPool();
    const chatId = uuid();

    await pool.query(
        `
        INSERT INTO generalChats (id, name, type, createdBy)
        VALUES (?, ?, ?, ?)
        `,
        [chatId, name, type, createdBy]
    );

    await addGeneralChatMembersService(chatId, memberIds, requester);

    return {
        id: chatId,
        name,
        type,
        createdBy,
    };
};

export default createGeneralChatService;
