import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listEmployeeDocumentationsController from '../controllers/employeeDocumentation/listEmployeeDocumentationsController.js';
import listEmployeeDocumentationDraftsController from '../controllers/employeeDocumentation/listEmployeeDocumentationDraftsController.js';
import getEmployeeDocumentationController from '../controllers/employeeDocumentation/getEmployeeDocumentationController.js';
import updateEmployeeDocumentationController from '../controllers/employeeDocumentation/updateEmployeeDocumentationController.js';
import getEmployeeDocumentationFileController from '../controllers/employeeDocumentation/getEmployeeDocumentationFileController.js';
import saveEmployeeDocumentationDraftController from '../controllers/employeeDocumentation/saveEmployeeDocumentationDraftController.js';
import createUserFromDocumentationDraftController from '../controllers/employeeDocumentation/createUserFromDocumentationDraftController.js';
import getEmployeeDocumentationDraftFileController from '../controllers/employeeDocumentation/getEmployeeDocumentationDraftFileController.js';
import createDocumentationDraftTokenController from '../controllers/employeeDocumentation/createDocumentationDraftTokenController.js';
import getPublicDocumentationDraftController from '../controllers/employeeDocumentation/getPublicDocumentationDraftController.js';
import savePublicDocumentationDraftController from '../controllers/employeeDocumentation/savePublicDocumentationDraftController.js';

const router = express.Router();

router.get(
    '/employee-documentations',
    authUser,
    isAdmin,
    listEmployeeDocumentationsController
);
router.get(
    '/employee-documentation-drafts',
    authUser,
    isAdmin,
    listEmployeeDocumentationDraftsController
);
router.post(
    '/employee-documentation-drafts',
    authUser,
    isAdmin,
    saveEmployeeDocumentationDraftController
);
router.put(
    '/employee-documentation-drafts/:draftId',
    authUser,
    isAdmin,
    saveEmployeeDocumentationDraftController
);
router.post(
    '/employee-documentation-drafts/:draftId/create-user',
    authUser,
    isAdmin,
    createUserFromDocumentationDraftController
);
router.post(
    '/employee-documentation-drafts/:draftId/token',
    authUser,
    isAdmin,
    createDocumentationDraftTokenController
);
router.get(
    '/employee-documentation-drafts/:draftId/files/:field',
    authUser,
    isAdmin,
    getEmployeeDocumentationDraftFileController
);
router.get(
    '/public/employee-documentation-drafts/:token',
    getPublicDocumentationDraftController
);
router.put(
    '/public/employee-documentation-drafts/:token',
    savePublicDocumentationDraftController
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
