import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import isEmployee from '../middleware/isEmployee.js';
import serviceExists from '../middleware/serviceExists.js';
import shiftRecordExists from '../middleware/shiftRecordExists.js';
import createWorkReportController from '../controllers/workReports/createWorkReportController.js';
import saveWorkReportDraftController from '../controllers/workReports/saveWorkReportDraftController.js';
import selectWorkReportDraftController from '../controllers/workReports/selectWorkReportDraftController.js';
import downloadWorkReportsZipController from '../controllers/workReports/downloadWorkReportsZipController.js';
import downloadWorkReportPdfController from '../controllers/workReports/downloadWorkReportPdfController.js';
import deleteWorkReportsController from '../controllers/workReports/deleteWorkReportsController.js';

import {
    newShiftRecordController,
    listShiftRecordsController,
    listEmployeeShiftRecordsController,
    editShiftRecordController,
    detailShiftRecordController,
    startShiftRecordsController,
    endShiftRecordsController,
    deleteShiftRecordController,
} from '../controllers/shiftRecords/index.js';

const router = express.Router();

router.post(
    '/shiftRecords/clockIn',
    authUser,
    isEmployee,
    startShiftRecordsController
);

router.get('/shiftRecords', authUser, isAdmin, listShiftRecordsController);

router.get(
    '/workReports/zip',
    authUser,
    isAdmin,
    downloadWorkReportsZipController
);

router.get(
    '/workReports/:reportId/pdf',
    authUser,
    isAdmin,
    downloadWorkReportPdfController
);

router.delete(
    '/workReports',
    authUser,
    isAdmin,
    deleteWorkReportsController
);

router.get(
    '/shiftRecords/employee',
    authUser,
    isEmployee,
    listEmployeeShiftRecordsController
);

router.get(
    '/shiftRecords/:shiftRecordId',
    authUser,
    shiftRecordExists,
    detailShiftRecordController
);

router.post(
    '/shiftRecords/:serviceId',
    authUser,
    isAdmin,
    serviceExists,
    newShiftRecordController
);



router.put(
    '/shiftRecords/edit/:shiftRecordId',
    authUser,
    isAdmin,
    shiftRecordExists,
    editShiftRecordController
);

router.patch(
    '/shiftRecords/:shiftRecordId',
    authUser,
    isEmployee,
    shiftRecordExists,
    endShiftRecordsController
);

router.post(
    '/shiftRecords/:shiftRecordId/report',
    authUser,
    isEmployee,
    shiftRecordExists,
    createWorkReportController
);

router.get(
    '/shiftRecords/:shiftRecordId/report/draft',
    authUser,
    isEmployee,
    shiftRecordExists,
    selectWorkReportDraftController
);

router.post(
    '/shiftRecords/:shiftRecordId/report/draft',
    authUser,
    isEmployee,
    shiftRecordExists,
    saveWorkReportDraftController
);

router.delete(
    '/shiftRecords/:shiftRecordId',
    authUser,
    isAdmin,
    shiftRecordExists,
    deleteShiftRecordController
);

export default router;
