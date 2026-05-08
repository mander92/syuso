import createEmployeeRequestService from '../../services/employeeRequests/createEmployeeRequestService.js';
import { getIO } from '../../sockets/io.js';

const createEmployeeRequestController = async (req, res, next) => {
    try {
        const data = await createEmployeeRequestService({
            employeeId: req.userLogged.id,
            requestType: req.body.requestType,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            notes: req.body.notes,
        });

        getIO()?.to('admins').emit('employeeRequest:created', data);

        res.status(201).send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createEmployeeRequestController;
