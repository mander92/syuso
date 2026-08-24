import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import {
    deletePushSubscriptionController,
    disablePushSubscriptionController,
    getPushConfigController,
    listMyPushSubscriptionsController,
    listPushAdminSummaryController,
    registerPushSubscriptionController,
    sendCurrentDeviceTestPushController,
    sendTestPushController,
} from '../controllers/push/pushController.js';

const router = express.Router();

router.get('/push/config', authUser, getPushConfigController);
router.get('/push/subscriptions', authUser, listMyPushSubscriptionsController);
router.post('/push/subscriptions', authUser, registerPushSubscriptionController);
router.post(
    '/push/subscriptions/:subscriptionId/disable',
    authUser,
    disablePushSubscriptionController
);
router.delete(
    '/push/subscriptions/:subscriptionId',
    authUser,
    deletePushSubscriptionController
);
router.post('/push/test', authUser, sendTestPushController);
router.post('/push/test-current', authUser, sendCurrentDeviceTestPushController);
router.get('/push/admin/users', authUser, isAdmin, listPushAdminSummaryController);

export default router;
