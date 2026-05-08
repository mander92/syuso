import { listUserEmployeeRequestsService } from '../../services/employeeRequests/listEmployeeRequestsService.js';

const listMyEmployeeRequestsController = async (req, res, next) => {
    try {
        const data = await listUserEmployeeRequestsService(req.userLogged.id);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listMyEmployeeRequestsController;
