import rejectEmployeeRequestService from '../../services/employeeRequests/rejectEmployeeRequestService.js';
import { getIO } from '../../sockets/io.js';

const rejectEmployeeRequestController = async (req, res, next) => {
    try {
        const data = await rejectEmployeeRequestService({
            requestId: req.params.id,
            adminId: req.userLogged.id,
            decisionNotes: req.body.decisionNotes,
        });

        getIO()
            ?.to(`user:${data.employeeId}`)
            .emit('employeeRequest:rejected', data);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default rejectEmployeeRequestController;
