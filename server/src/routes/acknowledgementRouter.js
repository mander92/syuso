import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import {
    acceptAcknowledgementController,
    createAcknowledgementController,
    listAcknowledgementsAuditController,
    listMyAcknowledgementsController,
    markAcknowledgementSeenController,
} from '../controllers/acknowledgements/acknowledgementController.js';

const router = express.Router();

router.get('/acknowledgements', authUser, listMyAcknowledgementsController);
router.get(
    '/acknowledgements/audit',
    authUser,
    isAdmin,
    listAcknowledgementsAuditController
);
router.post(
    '/acknowledgements',
    authUser,
    isAdmin,
    createAcknowledgementController
);
router.put(
    '/acknowledgements/:acknowledgementId/seen',
    authUser,
    markAcknowledgementSeenController
);
router.put(
    '/acknowledgements/:acknowledgementId/accept',
    authUser,
    acceptAcknowledgementController
);

export default router;
