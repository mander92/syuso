import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import isEmployee from '../middleware/isEmployee.js';
import createEmployeeRequestController from '../controllers/employeeRequests/createEmployeeRequestController.js';
import listMyEmployeeRequestsController from '../controllers/employeeRequests/listMyEmployeeRequestsController.js';
import listAdminEmployeeRequestsController from '../controllers/employeeRequests/listAdminEmployeeRequestsController.js';
import approveEmployeeRequestController from '../controllers/employeeRequests/approveEmployeeRequestController.js';
import rejectEmployeeRequestController from '../controllers/employeeRequests/rejectEmployeeRequestController.js';

const employeeRequestRouter = express.Router();

employeeRequestRouter.post('/employee-requests', authUser, isEmployee, createEmployeeRequestController);
employeeRequestRouter.get('/employee-requests/mine', authUser, listMyEmployeeRequestsController);
employeeRequestRouter.get('/employee-requests/admin', authUser, isAdmin, listAdminEmployeeRequestsController);
employeeRequestRouter.post('/employee-requests/:id/approve', authUser, isAdmin, approveEmployeeRequestController);
employeeRequestRouter.post('/employee-requests/:id/reject', authUser, isAdmin, rejectEmployeeRequestController);

export default employeeRequestRouter;
