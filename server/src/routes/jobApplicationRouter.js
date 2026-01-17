import express from 'express';
import createJobApplicationController from '../controllers/jobs/createJobApplicationController.js';
import listJobApplicationsController from '../controllers/jobs/listJobApplicationsController.js';
import authUser from '../middleware/authUser.js';
import isSudo from '../middleware/isSudo.js';

const router = express.Router();

router.post('/jobs/apply', createJobApplicationController);
router.get(
    '/jobs/applications',
    authUser,
    isSudo,
    listJobApplicationsController
);

export default router;

