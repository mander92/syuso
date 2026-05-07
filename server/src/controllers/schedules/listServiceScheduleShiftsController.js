import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const ensureScheduleReadAccess = async (serviceId, userId, role) => {
    if (role === 'sudo' || role === 'admin') {
        await ensureServiceDelegationAccessService(serviceId, userId, role);
        return;
    }

    const pool = await getPool();

    if (role === 'client') {
        const [services] = await pool.query(
            'SELECT id FROM services WHERE id = ? AND clientId = ? AND deletedAt IS NULL',
            [serviceId, userId]
        );

        if (!services.length) generateErrorUtil('Acceso denegado', 403);
        return;
    }

    const [assigned] = await pool.query(
        'SELECT id FROM personsAssigned WHERE serviceId = ? AND employeeId = ?',
        [serviceId, userId]
    );

    if (!assigned.length) generateErrorUtil('Acceso denegado', 403);
};

const listServiceScheduleShiftsController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month } = req.query;
        const { id: userId, role } = req.userLogged;

        await ensureScheduleReadAccess(serviceId, userId, role);

        const data = await listServiceScheduleShiftsService(serviceId, month);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listServiceScheduleShiftsController;
