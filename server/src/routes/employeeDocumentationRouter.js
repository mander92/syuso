import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listEmployeeDocumentationsController from '../controllers/employeeDocumentation/listEmployeeDocumentationsController.js';
import getEmployeeDocumentationController from '../controllers/employeeDocumentation/getEmployeeDocumentationController.js';
import updateEmployeeDocumentationController from '../controllers/employeeDocumentation/updateEmployeeDocumentationController.js';
import getEmployeeDocumentationFileController from '../controllers/employeeDocumentation/getEmployeeDocumentationFileController.js';

const router = express.Router();

router.get(
    '/employee-documentations',
    authUser,
    isAdmin,
    listEmployeeDocumentationsController
);
router.get('/employee-documentations/me', authUser, getEmployeeDocumentationController);
router.put('/employee-documentations/me', authUser, updateEmployeeDocumentationController);
router.get(
    '/employee-documentations/:userId',
    authUser,
    getEmployeeDocumentationController
);
router.put(
    '/employee-documentations/:userId',
    authUser,
    updateEmployeeDocumentationController
);
router.get(
    '/employee-documentations/:userId/files/:field',
    authUser,
    getEmployeeDocumentationFileController
);

export default router;
