import express from 'express';

import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import listWarehouseController from '../controllers/warehouse/listWarehouseController.js';
import createWarehouseMovementController from '../controllers/warehouse/createWarehouseMovementController.js';
import deleteWarehouseMovementController from '../controllers/warehouse/deleteWarehouseMovementController.js';

const router = express.Router();

router.get('/warehouse', authUser, isAdmin, listWarehouseController);
router.post('/warehouse/movements', authUser, isAdmin, createWarehouseMovementController);
router.delete(
    '/warehouse/movements/:movementId',
    authUser,
    isAdmin,
    deleteWarehouseMovementController
);

export default router;
