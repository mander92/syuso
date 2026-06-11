import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listBillingRecordsController from '../controllers/billing/listBillingRecordsController.js';
import calculateBillingController from '../controllers/billing/calculateBillingController.js';
import requestInvoiceController from '../controllers/billing/requestInvoiceController.js';
import sendInvoiceToClientController from '../controllers/billing/sendInvoiceToClientController.js';
import deleteBillingRecordController from '../controllers/billing/deleteBillingRecordController.js';

const router = express.Router();

router.get('/billing', authUser, isAdmin, listBillingRecordsController);
router.get('/billing/calculate', authUser, isAdmin, calculateBillingController);
router.post('/billing/request-invoice', authUser, isAdmin, requestInvoiceController);
router.post(
    '/billing/:billingRecordId/send-invoice',
    authUser,
    isAdmin,
    sendInvoiceToClientController
);
router.delete(
    '/billing/:billingRecordId',
    authUser,
    isAdmin,
    deleteBillingRecordController
);

export default router;
