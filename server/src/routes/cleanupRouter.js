import express from 'express';

import authUser from '../middleware/authUser.js';
import isSudo from '../middleware/isSudo.js';
import cleanupUploadsController from '../controllers/admin/cleanupUploadsController.js';
import storageUsageController from '../controllers/admin/storageUsageController.js';

const router = express.Router();

router.post('/admin/cleanup', authUser, isSudo, cleanupUploadsController);
router.get('/admin/storage', authUser, isSudo, storageUsageController);

export default router;
