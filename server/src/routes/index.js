import express from 'express';

import userRouter from './userRouter.js';
import typeOfServiceRouter from './typeOfServiceRouter.js';
import serviceRouter from './serviceRouter.js';
import shiftRecordRouter from './shiftRecordRouter.js';
import personAssigned from './personAssigned.js';
import requests from './requests.js';
import jobsApplication from './jobApplicationRouter.js'
import delegationRouter from './delegationRouter.js';

const router = express.Router();

router.use(userRouter);
router.use(typeOfServiceRouter);
router.use(serviceRouter);
router.use(shiftRecordRouter);
router.use(personAssigned);
router.use(requests);
router.use(jobsApplication);
router.use(delegationRouter);

export default router;
