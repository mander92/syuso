import { listAdminEmployeeRequestsService } from '../../services/employeeRequests/listEmployeeRequestsService.js';

const listAdminEmployeeRequestsController = async (req, res, next) => {
    try {
        const data = await listAdminEmployeeRequestsService();

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listAdminEmployeeRequestsController;
