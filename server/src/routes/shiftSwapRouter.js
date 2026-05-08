import express from 'express';
import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import createShiftSwapRequestController from '../controllers/shiftSwaps/createShiftSwapRequestController.js';
import createAdminShiftSwapRequestController from '../controllers/shiftSwaps/createAdminShiftSwapRequestController.js';
import listUserShiftSwapRequestsController from '../controllers/shiftSwaps/listUserShiftSwapRequestsController.js';
import listAdminShiftSwapRequestsController from '../controllers/shiftSwaps/listAdminShiftSwapRequestsController.js';
import approveShiftSwapRequestController from '../controllers/shiftSwaps/approveShiftSwapRequestController.js';
import rejectShiftSwapRequestController from '../controllers/shiftSwaps/rejectShiftSwapRequestController.js';
import confirmShiftSwapRequestController from '../controllers/shiftSwaps/confirmShiftSwapRequestController.js';
import rejectCounterpartShiftSwapRequestController from '../controllers/shiftSwaps/rejectCounterpartShiftSwapRequestController.js';

const shiftSwapRouter = express.Router();

shiftSwapRouter.post('/shift-swaps', authUser, createShiftSwapRequestController);
shiftSwapRouter.post('/shift-swaps/admin', authUser, isAdmin, createAdminShiftSwapRequestController);
shiftSwapRouter.get('/shift-swaps/mine', authUser, listUserShiftSwapRequestsController);
shiftSwapRouter.get('/shift-swaps/admin', authUser, isAdmin, listAdminShiftSwapRequestsController);
shiftSwapRouter.post('/shift-swaps/:id/confirm', authUser, confirmShiftSwapRequestController);
shiftSwapRouter.post('/shift-swaps/:id/counterpart-reject', authUser, rejectCounterpartShiftSwapRequestController);
shiftSwapRouter.post('/shift-swaps/:id/approve', authUser, isAdmin, approveShiftSwapRequestController);
shiftSwapRouter.post('/shift-swaps/:id/reject', authUser, isAdmin, rejectShiftSwapRequestController);

export default shiftSwapRouter;
