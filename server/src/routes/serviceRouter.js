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
    listActiveServiceShiftsController,
    updateServiceScheduleImageController,
    updateServiceStatusController,
} from '../controllers/services/index.js';
import listServiceChatMessagesController from '../controllers/serviceChat/listServiceChatMessagesController.js';
import createServiceChatMessageController from '../controllers/serviceChat/createServiceChatMessageController.js';
import listServiceChatMembersController from '../controllers/serviceChat/listServiceChatMembersController.js';
import uploadServiceChatImageController from '../controllers/serviceChat/uploadServiceChatImageController.js';
import listServiceChatUnreadCountsController from '../controllers/serviceChat/listServiceChatUnreadCountsController.js';
import listServiceNfcTagsController from '../controllers/nfcTags/listServiceNfcTagsController.js';
import createServiceNfcTagController from '../controllers/nfcTags/createServiceNfcTagController.js';
import deleteServiceNfcTagController from '../controllers/nfcTags/deleteServiceNfcTagController.js';
import createServiceNfcLogController from '../controllers/nfcTags/createServiceNfcLogController.js';
import listServiceScheduleTemplatesController from '../controllers/schedules/listServiceScheduleTemplatesController.js';
import replaceServiceScheduleTemplatesController from '../controllers/schedules/replaceServiceScheduleTemplatesController.js';
import applyServiceScheduleTemplateController from '../controllers/schedules/applyServiceScheduleTemplateController.js';
import listServiceScheduleShiftsController from '../controllers/schedules/listServiceScheduleShiftsController.js';
import createServiceScheduleShiftController from '../controllers/schedules/createServiceScheduleShiftController.js';
import updateServiceScheduleShiftController from '../controllers/schedules/updateServiceScheduleShiftController.js';
import deleteServiceScheduleShiftController from '../controllers/schedules/deleteServiceScheduleShiftController.js';
import listEmployeeScheduleShiftsController from '../controllers/schedules/listEmployeeScheduleShiftsController.js';
import downloadServiceSchedulePdfController from '../controllers/schedules/downloadServiceSchedulePdfController.js';
import downloadServiceScheduleZipController from '../controllers/schedules/downloadServiceScheduleZipController.js';
import downloadEmployeeSchedulePdfController from '../controllers/schedules/downloadEmployeeSchedulePdfController.js';
import downloadEmployeeScheduleZipController from '../controllers/schedules/downloadEmployeeScheduleZipController.js';
import listServiceShiftTypesController from '../controllers/schedules/listServiceShiftTypesController.js';
import createServiceShiftTypeController from '../controllers/schedules/createServiceShiftTypeController.js';
import updateServiceShiftTypeController from '../controllers/schedules/updateServiceShiftTypeController.js';
import deleteServiceShiftTypeController from '../controllers/schedules/deleteServiceShiftTypeController.js';
import simulateServiceScheduleController from '../controllers/schedules/simulateServiceScheduleController.js';
import applyServiceScheduleSimulationController from '../controllers/schedules/applyServiceScheduleSimulationController.js';

const router = express.Router();

router.get('/services', authUser, isAdmin, listAdminServicesController);

router.get('/services/client', authUser, isClient, listClientServiceController);

router.get(
    '/services/employee',
    authUser,
    isEmployee,
    listEmployeeServiceController
);

router.get(
    '/services/employee/schedule',
    authUser,
    isEmployee,
    listEmployeeScheduleShiftsController
);

router.get(
    '/services/employee/schedule/pdf',
    authUser,
    downloadEmployeeSchedulePdfController
);

router.get(
    '/services/employee/schedule/zip',
    authUser,
    downloadEmployeeScheduleZipController
);

router.get('/services/in-progress', authUser, listInProgressServicesController);

router.get(
    '/services/:serviceId/active-shifts',
    authUser,
    isAdmin,
    serviceExists,
    listActiveServiceShiftsController
);

router.get(
    '/services/:serviceId/schedule/templates',
    authUser,
    isAdmin,
    serviceExists,
    listServiceScheduleTemplatesController
);

router.put(
    '/services/:serviceId/schedule/templates',
    authUser,
    isAdmin,
    serviceExists,
    replaceServiceScheduleTemplatesController
);

router.post(
    '/services/:serviceId/schedule/apply-template',
    authUser,
    isAdmin,
    serviceExists,
    applyServiceScheduleTemplateController
);

router.get(
    '/services/:serviceId/schedule/shifts',
    authUser,
    isAdmin,
    serviceExists,
    listServiceScheduleShiftsController
);

router.post(
    '/services/:serviceId/schedule/simulate',
    authUser,
    isAdmin,
    serviceExists,
    simulateServiceScheduleController
);

router.post(
    '/services/:serviceId/schedule/apply-simulation',
    authUser,
    isAdmin,
    serviceExists,
    applyServiceScheduleSimulationController
);

router.get(
    '/services/:serviceId/schedule/pdf',
    authUser,
    isAdmin,
    serviceExists,
    downloadServiceSchedulePdfController
);

router.get(
    '/services/schedule/zip',
    authUser,
    isAdmin,
    downloadServiceScheduleZipController
);

router.get(
    '/services/:serviceId/shift-types',
    authUser,
    isAdmin,
    serviceExists,
    listServiceShiftTypesController
);

router.post(
    '/services/:serviceId/shift-types',
    authUser,
    isAdmin,
    serviceExists,
    createServiceShiftTypeController
);

router.patch(
    '/services/:serviceId/shift-types/:shiftTypeId',
    authUser,
    isAdmin,
    serviceExists,
    updateServiceShiftTypeController
);

router.delete(
    '/services/:serviceId/shift-types/:shiftTypeId',
    authUser,
    isAdmin,
    serviceExists,
    deleteServiceShiftTypeController
);

router.post(
    '/services/:serviceId/schedule/shifts',
    authUser,
    isAdmin,
    serviceExists,
    createServiceScheduleShiftController
);

router.patch(
    '/services/:serviceId/schedule/shifts/:shiftId',
    authUser,
    isAdmin,
    serviceExists,
    updateServiceScheduleShiftController
);

router.delete(
    '/services/:serviceId/schedule/shifts/:shiftId',
    authUser,
    isAdmin,
    serviceExists,
    deleteServiceScheduleShiftController
);

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

router.get(
    '/services/chat/unread',
    authUser,
    listServiceChatUnreadCountsController
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

router.get(
    '/services/:serviceId/nfc-tags',
    authUser,
    isAdmin,
    serviceExists,
    listServiceNfcTagsController
);

router.post(
    '/services/:serviceId/nfc-tags',
    authUser,
    isAdmin,
    serviceExists,
    createServiceNfcTagController
);

router.delete(
    '/services/:serviceId/nfc-tags/:tagId',
    authUser,
    isAdmin,
    serviceExists,
    deleteServiceNfcTagController
);

router.post(
    '/services/:serviceId/nfc-logs',
    authUser,
    isEmployee,
    serviceExists,
    createServiceNfcLogController
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
