import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listSalarySettlementsController from '../controllers/salarySettlements/listSalarySettlementsController.js';
import upsertSalaryRateController from '../controllers/salarySettlements/upsertSalaryRateController.js';
import createSalaryAdjustmentController from '../controllers/salarySettlements/createSalaryAdjustmentController.js';
import deleteSalaryAdjustmentController from '../controllers/salarySettlements/deleteSalaryAdjustmentController.js';
import upsertSalaryAbsencePaymentController from '../controllers/salarySettlements/upsertSalaryAbsencePaymentController.js';
import upsertSalaryPaidServiceHoursController from '../controllers/salarySettlements/upsertSalaryPaidServiceHoursController.js';

const router = express.Router();

router.get('/salary-settlements', authUser, isAdmin, listSalarySettlementsController);
router.put('/salary-settlements/rates', authUser, isAdmin, upsertSalaryRateController);
router.post(
    '/salary-settlements/adjustments',
    authUser,
    isAdmin,
    createSalaryAdjustmentController
);
router.delete(
    '/salary-settlements/adjustments/:adjustmentId',
    authUser,
    isAdmin,
    deleteSalaryAdjustmentController
);
router.put(
    '/salary-settlements/absence-payments',
    authUser,
    isAdmin,
    upsertSalaryAbsencePaymentController
);
router.put(
    '/salary-settlements/paid-service-hours',
    authUser,
    isAdmin,
    upsertSalaryPaidServiceHoursController
);

export default router;
