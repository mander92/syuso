import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import addGeneralChatMembersService from './addGeneralChatMembersService.js';

const getDirectChat = async (pool, requesterId, employeeId) => {
    const [rows] = await pool.query(
        `
        SELECT c.id, c.name, c.type, c.createdBy, c.createdAt
        FROM generalChats c
        INNER JOIN generalChatMembers requester
            ON requester.chatId = c.id AND requester.userId = ?
        INNER JOIN generalChatMembers employee
            ON employee.chatId = c.id AND employee.userId = ?
        WHERE c.type = 'direct'
          AND c.deletedAt IS NULL
        ORDER BY c.createdAt DESC
        LIMIT 1
        `,
        [requesterId, employeeId]
    );

    return rows[0] || null;
};

const createGeneralChatService = async (name, type, createdBy, memberIds, requester) => {
    const pool = await getPool();
    if (type === 'direct') {
        const employeeId = Array.from(new Set(memberIds || [])).find(
            (id) => id && id !== createdBy
        );

        if (employeeId) {
            const existing = await getDirectChat(pool, createdBy, employeeId);
            if (existing) {
                return existing;
            }
        }
    }

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
