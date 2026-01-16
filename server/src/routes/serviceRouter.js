import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import isClient from '../middleware/isClient.js';
import isAdminOrClient from '../middleware/isAdminOrClient.js';
import isEmployee from '../middleware/isEmployee.js';
import serviceExists from '../middleware/serviceExists.js';
import typeOfServiceExists from '../middleware/typeOfServiceExists.js';

import {
    newServiceController,
    listAdminServicesController,
    detailServiceController,
    deleteServiceByIdController,
    listClientServiceController,
    listEmployeeServiceController,
    editServiceController,
    validateServiceController,
    listInProgressServicesController,
    updateServiceScheduleImageController,
    updateServiceStatusController,
} from '../controllers/services/index.js';
import listServiceChatMessagesController from '../controllers/serviceChat/listServiceChatMessagesController.js';
import createServiceChatMessageController from '../controllers/serviceChat/createServiceChatMessageController.js';
import listServiceChatMembersController from '../controllers/serviceChat/listServiceChatMembersController.js';
import uploadServiceChatImageController from '../controllers/serviceChat/uploadServiceChatImageController.js';

const router = express.Router();

router.get('/services', authUser, isAdmin, listAdminServicesController);

router.get('/services/client', authUser, isClient, listClientServiceController);

router.get(
    '/services/employee',
    authUser,
    isEmployee,
    listEmployeeServiceController
);

router.get('/services/in-progress', authUser, listInProgressServicesController);

router.get(
    '/services/:serviceId',
    authUser,
    serviceExists,
    detailServiceController
);

router.get(
    '/services/:serviceId/chat',
    authUser,
    serviceExists,
    listServiceChatMessagesController
);

router.get(
    '/services/:serviceId/chat/members',
    authUser,
    serviceExists,
    listServiceChatMembersController
);

router.post(
    '/services/:serviceId/chat',
    authUser,
    serviceExists,
    createServiceChatMessageController
);

router.post(
    '/services/:serviceId/chat/image',
    authUser,
    serviceExists,
    uploadServiceChatImageController
);

router.post(
    '/services/:serviceId/schedule-image',
    authUser,
    isAdmin,
    serviceExists,
    updateServiceScheduleImageController
);

router.get('/services/validate/:validationCode', validateServiceController);

router.post(
    '/services/:typeOfServiceId',
    authUser,
    //typeOfServiceExists,
    newServiceController
);

router.put(
    '/services/:serviceId',
    authUser,
    isAdminOrClient,
    serviceExists,
    editServiceController
);

router.patch(
    '/services/:serviceId/status',
    authUser,
    isAdmin,
    serviceExists,
    updateServiceStatusController
);

router.delete(
    '/services/:serviceId',
    authUser,
    isClient,
    serviceExists,
    deleteServiceByIdController
);

export default router;
