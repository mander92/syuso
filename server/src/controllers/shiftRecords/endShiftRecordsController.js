import endShiftRecordService from '../../services/shiftRecords/endShiftRecordService.js';

const endShiftRecordsController = async (req, res, next) => {
    try {

        const { serviceId, location, clockOut, employeeId } = req.body;
        const { shiftRecordId } = req.params;
        const endDateTime = new Date(clockOut);

        await endShiftRecordService(
            shiftRecordId,
            employeeId,
            location,
            endDateTime,
            serviceId,
            {
                userId: req.userLogged.id,
                role: req.userLogged.role,
                req,
            }
        );

        res.send({
            status: 'ok',
            message: 'Hora de finalizacón registrada',
        });
    } catch (error) {
        next(error);
    }
};

export default endShiftRecordsController;
