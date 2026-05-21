import express from 'express';

import userRouter from './userRouter.js';
import typeOfServiceRouter from './typeOfServiceRouter.js';
import serviceRouter from './serviceRouter.js';
import shiftRecordRouter from './shiftRecordRouter.js';
import personAssigned from './personAssigned.js';
import requests from './requests.js';
import jobsApplication from './jobApplicationRouter.js';
import delegationRouter from './delegationRouter.js';
import cleanupRouter from './cleanupRouter.js';
import generalChatRouter from './generalChatRouter.js';
import shiftSwapRouter from './shiftSwapRouter.js';
import employeeRequestRouter from './employeeRequestRouter.js';
import holidayRouter from './holidayRouter.js';
import employeeDocumentationRouter from './employeeDocumentationRouter.js';
import warehouseRouter from './warehouseRouter.js';

const router = express.Router();

router.use(userRouter);
router.use(typeOfServiceRouter);
router.use(serviceRouter);
router.use(shiftRecordRouter);
router.use(personAssigned);
router.use(requests);
router.use(jobsApplication);
router.use(delegationRouter);
router.use(cleanupRouter);
router.use(generalChatRouter);
router.use(shiftSwapRouter);
router.use(employeeRequestRouter);
router.use(holidayRouter);
router.use(employeeDocumentationRouter);
router.use(warehouseRouter);

export default router;
