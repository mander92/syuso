import express from 'express';

import authUser from '../middleware/authUser.js';
import isSudo from '../middleware/isSudo.js';

import listGeneralChatsController from '../controllers/generalChat/listGeneralChatsController.js';
import createGeneralChatController from '../controllers/generalChat/createGeneralChatController.js';
import listGeneralChatMembersController from '../controllers/generalChat/listGeneralChatMembersController.js';
import addGeneralChatMembersController from '../controllers/generalChat/addGeneralChatMembersController.js';
import removeGeneralChatMemberController from '../controllers/generalChat/removeGeneralChatMemberController.js';
import listGeneralChatMessagesController from '../controllers/generalChat/listGeneralChatMessagesController.js';
import uploadGeneralChatImageController from '../controllers/generalChat/uploadGeneralChatImageController.js';
import listGeneralChatUnreadCountsController from '../controllers/generalChat/listGeneralChatUnreadCountsController.js';

const router = express.Router();

router.get('/general-chats', authUser, listGeneralChatsController);
router.get('/general-chats/unread', authUser, listGeneralChatUnreadCountsController);
router.post('/general-chats', authUser, createGeneralChatController);

router.get('/general-chats/:chatId/members', authUser, listGeneralChatMembersController);
router.post('/general-chats/:chatId/members', authUser, addGeneralChatMembersController);
router.delete('/general-chats/:chatId/members/:memberId', authUser, removeGeneralChatMemberController);

router.get('/general-chats/:chatId/messages', authUser, listGeneralChatMessagesController);
router.post('/general-chats/:chatId/image', authUser, uploadGeneralChatImageController);

export default router;
