import express from 'express';
import createJobApplicationController from '../controllers/jobs/createJobApplicationController.js';

const router = express.Router();

router.post('/jobs/apply', createJobApplicationController);

export default router;

