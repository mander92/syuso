import express from 'express';
import createJobApplicationController from '../controllers/jobs/createJobApplicationController.js';
import listJobApplicationsController from '../controllers/jobs/listJobApplicationsController.js';
import downloadJobApplicationsZipController from '../controllers/jobs/downloadJobApplicationsZipController.js';
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
router.get(
    '/jobs/applications/zip',
    authUser,
    isSudo,
    downloadJobApplicationsZipController
);

export default router;

