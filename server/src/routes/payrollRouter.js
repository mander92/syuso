import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import importPayrollsController from '../controllers/payrolls/importPayrollsController.js';
import listPayrollsController from '../controllers/payrolls/listPayrollsController.js';
import updatePayrollController from '../controllers/payrolls/updatePayrollController.js';
import deletePayrollController from '../controllers/payrolls/deletePayrollController.js';
import getPayrollFileController from '../controllers/payrolls/getPayrollFileController.js';

const router = express.Router();

router.get('/payrolls', authUser, listPayrollsController);
router.post('/payrolls/import', authUser, isAdmin, importPayrollsController);
router.put('/payrolls/:payrollId', authUser, isAdmin, updatePayrollController);
router.delete('/payrolls/:payrollId', authUser, isAdmin, deletePayrollController);
router.get('/payrolls/:payrollId/file', authUser, getPayrollFileController);

export default router;
