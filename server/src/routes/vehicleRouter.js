import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import {
    assignVehiclesToServiceController,
    createVehicleController,
    createVehicleFuelLogController,
    createVehicleInspectionController,
    deleteVehicleController,
    getVehicleInspectionStatusController,
    listServiceVehiclesController,
    listVehiclesController,
    updateVehicleController,
} from '../controllers/vehicles/vehicleControllers.js';

const router = express.Router();

router.get('/vehicles', authUser, isAdmin, listVehiclesController);
router.post('/vehicles', authUser, isAdmin, createVehicleController);
router.patch('/vehicles/:vehicleId', authUser, isAdmin, updateVehicleController);
router.delete('/vehicles/:vehicleId', authUser, isAdmin, deleteVehicleController);
router.post('/vehicles/:vehicleId/fuel', authUser, isAdmin, createVehicleFuelLogController);

router.get('/services/:serviceId/vehicles', authUser, listServiceVehiclesController);
router.get(
    '/services/:serviceId/vehicles/inspection-status',
    authUser,
    getVehicleInspectionStatusController
);
router.put('/services/:serviceId/vehicles', authUser, isAdmin, assignVehiclesToServiceController);
router.post(
    '/services/:serviceId/vehicles/:vehicleId/inspections',
    authUser,
    createVehicleInspectionController
);

export default router;
