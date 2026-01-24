import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import isSudo from '../middleware/isSudo.js';
import userExists from '../middleware/userExists.js';

import {
    registerUserController,
    validateUserController,
    loginUserController,
    changeUserPasswordController,
    sendRecoverPasswordCodeController,
    registerUserAdminController,
    editUserController,
    getUserController,
    listUsersController,
    deleteUserController,
    editUserAvatarController,
    editUserPasswordController,
    getUserProfileController,
    adminSetUserPasswordController,
} from '../controllers/users/index.js';
import getEmployeeRulesController from '../controllers/schedules/getEmployeeRulesController.js';
import updateEmployeeRulesController from '../controllers/schedules/updateEmployeeRulesController.js';
import listEmployeeAbsencesController from '../controllers/schedules/listEmployeeAbsencesController.js';
import createEmployeeAbsenceController from '../controllers/schedules/createEmployeeAbsenceController.js';
import deleteEmployeeAbsenceController from '../controllers/schedules/deleteEmployeeAbsenceController.js';

const router = express.Router();

router.get('/users/validate/:registrationCode', validateUserController);

router.get('/users', authUser, isAdmin, listUsersController);

router.get('/user', authUser, getUserProfileController);

router.get(
    '/user/admin/:userId',
    authUser,
    isAdmin,
    userExists,
    getUserController
);

router.post('/users/register', registerUserController);

router.post('/users/login', loginUserController);

router.post('/users/password/recover', sendRecoverPasswordCodeController);

router.post(
    '/users/admin/register',
    authUser,
    isAdmin,
    registerUserAdminController
);

router.post(
    '/user/avatar/:userId',
    authUser,
    userExists,
    editUserAvatarController
);

router.patch('/users/password', changeUserPasswordController);

router.put('/user/:userId', authUser, userExists, editUserController);

router.get(
    '/users/:userId/rules',
    authUser,
    isAdmin,
    userExists,
    getEmployeeRulesController
);

router.put(
    '/users/:userId/rules',
    authUser,
    isAdmin,
    userExists,
    updateEmployeeRulesController
);

router.get(
    '/users/:userId/absences',
    authUser,
    isAdmin,
    userExists,
    listEmployeeAbsencesController
);

router.post(
    '/users/:userId/absences',
    authUser,
    isAdmin,
    userExists,
    createEmployeeAbsenceController
);

router.delete(
    '/users/:userId/absences/:absenceId',
    authUser,
    isAdmin,
    userExists,
    deleteEmployeeAbsenceController
);

router.put(
    '/user/password/:userId',
    authUser,
    userExists,
    editUserPasswordController
);

router.put(
    '/user/admin/password/:userId',
    authUser,
    isSudo,
    userExists,
    adminSetUserPasswordController
);

router.delete('/user/:userId', authUser, userExists, deleteUserController);

export default router;
