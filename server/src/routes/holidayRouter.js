import express from 'express';
import authUser from '../middleware/authUser.js';
import isAdmin from '../middleware/isAdmin.js';
import {
    listHolidaysController,
    createHolidayController,
    updateHolidayController,
    deleteHolidayController,
} from '../controllers/holidays/index.js';

const router = express.Router();

router.get('/holidays', authUser, isAdmin, listHolidaysController);
router.post('/holidays', authUser, isAdmin, createHolidayController);
router.patch('/holidays/:holidayId', authUser, isAdmin, updateHolidayController);
router.delete('/holidays/:holidayId', authUser, isAdmin, deleteHolidayController);

export default router;
