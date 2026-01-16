import express from 'express';
import createConsultingRequestController from '../controllers/requests/createConsultingRequestController.js';

const router = express.Router();

router.post('/consulting', createConsultingRequestController);

export default router;
