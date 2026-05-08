import approveEmployeeRequestService from '../../services/employeeRequests/approveEmployeeRequestService.js';
import { getIO } from '../../sockets/io.js';

const approveEmployeeRequestController = async (req, res, next) => {
    try {
        const data = await approveEmployeeRequestService({
            requestId: req.params.id,
            adminId: req.userLogged.id,
            decisionNotes: req.body.decisionNotes,
        });

        getIO()
            ?.to(`user:${data.employeeId}`)
            .emit('employeeRequest:approved', data);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default approveEmployeeRequestController;
