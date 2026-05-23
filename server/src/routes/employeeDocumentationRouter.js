import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listEmployeeDocumentationsController from '../controllers/employeeDocumentation/listEmployeeDocumentationsController.js';
import listEmployeeDocumentationDraftsController from '../controllers/employeeDocumentation/listEmployeeDocumentationDraftsController.js';
import getEmployeeDocumentationController from '../controllers/employeeDocumentation/getEmployeeDocumentationController.js';
import updateEmployeeDocumentationController from '../controllers/employeeDocumentation/updateEmployeeDocumentationController.js';
import getEmployeeDocumentationFileController from '../controllers/employeeDocumentation/getEmployeeDocumentationFileController.js';
import clearEmployeeDocumentationFileController from '../controllers/employeeDocumentation/clearEmployeeDocumentationFileController.js';
import listEmployeeSignatureDocumentsController from '../controllers/employeeDocumentation/listEmployeeSignatureDocumentsController.js';
import createEmployeeSignatureDocumentController from '../controllers/employeeDocumentation/createEmployeeSignatureDocumentController.js';
import signEmployeeSignatureDocumentController from '../controllers/employeeDocumentation/signEmployeeSignatureDocumentController.js';
import validateEmployeeSignatureDocumentController from '../controllers/employeeDocumentation/validateEmployeeSignatureDocumentController.js';
import reopenEmployeeSignatureDocumentController from '../controllers/employeeDocumentation/reopenEmployeeSignatureDocumentController.js';
import deleteEmployeeSignatureDocumentController from '../controllers/employeeDocumentation/deleteEmployeeSignatureDocumentController.js';
import getEmployeeSignatureDocumentFileController from '../controllers/employeeDocumentation/getEmployeeSignatureDocumentFileController.js';
import saveEmployeeDocumentationDraftController from '../controllers/employeeDocumentation/saveEmployeeDocumentationDraftController.js';
import createUserFromDocumentationDraftController from '../controllers/employeeDocumentation/createUserFromDocumentationDraftController.js';
import getEmployeeDocumentationDraftFileController from '../controllers/employeeDocumentation/getEmployeeDocumentationDraftFileController.js';
import createDocumentationDraftTokenController from '../controllers/employeeDocumentation/createDocumentationDraftTokenController.js';
import deleteEmployeeDocumentationDraftController from '../controllers/employeeDocumentation/deleteEmployeeDocumentationDraftController.js';
import getPublicDocumentationDraftController from '../controllers/employeeDocumentation/getPublicDocumentationDraftController.js';
import savePublicDocumentationDraftController from '../controllers/employeeDocumentation/savePublicDocumentationDraftController.js';
import listClientDocumentationsController from '../controllers/clientDocumentation/listClientDocumentationsController.js';
import saveClientDocumentationController from '../controllers/clientDocumentation/saveClientDocumentationController.js';
import getClientDocumentationFileController from '../controllers/clientDocumentation/getClientDocumentationFileController.js';
import listClientDocumentationDraftsController from '../controllers/clientDocumentation/listClientDocumentationDraftsController.js';
import saveClientDocumentationDraftController from '../controllers/clientDocumentation/saveClientDocumentationDraftController.js';
import createClientDocumentationDraftTokenController from '../controllers/clientDocumentation/createClientDocumentationDraftTokenController.js';
import getPublicClientDocumentationDraftController from '../controllers/clientDocumentation/getPublicClientDocumentationDraftController.js';
import savePublicClientDocumentationDraftController from '../controllers/clientDocumentation/savePublicClientDocumentationDraftController.js';
import getClientDocumentationDraftFileController from '../controllers/clientDocumentation/getClientDocumentationDraftFileController.js';
import createClientFromDocumentationDraftController from '../controllers/clientDocumentation/createClientFromDocumentationDraftController.js';
import deleteClientDocumentationDraftController from '../controllers/clientDocumentation/deleteClientDocumentationDraftController.js';

const router = express.Router();

router.get(
    '/employee-documentations',
    authUser,
    isAdmin,
    listEmployeeDocumentationsController
);
router.get(
    '/employee-signature-documents',
    authUser,
    listEmployeeSignatureDocumentsController
);
router.post(
    '/employee-signature-documents',
    authUser,
    isAdmin,
    createEmployeeSignatureDocumentController
);
router.put(
    '/employee-signature-documents/:documentId/sign',
    authUser,
    signEmployeeSignatureDocumentController
);
router.put(
    '/employee-signature-documents/:documentId/validate',
    authUser,
    isAdmin,
    validateEmployeeSignatureDocumentController
);
router.put(
    '/employee-signature-documents/:documentId/reopen',
    authUser,
    isAdmin,
    reopenEmployeeSignatureDocumentController
);
router.delete(
    '/employee-signature-documents/:documentId',
    authUser,
    isAdmin,
    deleteEmployeeSignatureDocumentController
);
router.get(
    '/employee-signature-documents/:documentId/files/:fileType',
    authUser,
    getEmployeeSignatureDocumentFileController
);
router.get(
    '/client-documentations',
    authUser,
    isAdmin,
    listClientDocumentationsController
);
router.post(
    '/client-documentations',
    authUser,
    isAdmin,
    saveClientDocumentationController
);
router.put(
    '/client-documentations/:clientId',
    authUser,
    isAdmin,
    saveClientDocumentationController
);
router.get(
    '/client-documentations/:clientId/files/:field',
    authUser,
    isAdmin,
    getClientDocumentationFileController
);
router.get(
    '/client-documentation-drafts',
    authUser,
    isAdmin,
    listClientDocumentationDraftsController
);
router.post(
    '/client-documentation-drafts',
    authUser,
    isAdmin,
    saveClientDocumentationDraftController
);
router.put(
    '/client-documentation-drafts/:draftId',
    authUser,
    isAdmin,
    saveClientDocumentationDraftController
);
router.delete(
    '/client-documentation-drafts/:draftId',
    authUser,
    isAdmin,
    deleteClientDocumentationDraftController
);
router.post(
    '/client-documentation-drafts/:draftId/token',
    authUser,
    isAdmin,
    createClientDocumentationDraftTokenController
);
router.post(
    '/client-documentation-drafts/:draftId/create-client',
    authUser,
    isAdmin,
    createClientFromDocumentationDraftController
);
router.get(
    '/client-documentation-drafts/:draftId/files/:field',
    authUser,
    isAdmin,
    getClientDocumentationDraftFileController
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
router.delete(
    '/employee-documentation-drafts/:draftId',
    authUser,
    isAdmin,
    deleteEmployeeDocumentationDraftController
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
router.get(
    '/public/client-documentation-drafts/:token',
    getPublicClientDocumentationDraftController
);
router.put(
    '/public/client-documentation-drafts/:token',
    savePublicClientDocumentationDraftController
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
router.delete(
    '/employee-documentations/:userId/files/:field',
    authUser,
    isAdmin,
    clearEmployeeDocumentationFileController
);

export default router;
