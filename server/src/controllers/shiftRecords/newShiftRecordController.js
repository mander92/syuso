import Joi from 'joi';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import insertShiftRecordService from '../../services/shiftRecords/insertShiftRecordService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const newShiftRecordController = async (req, res, next) => {
    try {
        const schema = Joi.object().keys({
            employeeId: Joi.string().length(36).required(),
            clockIn: Joi.string().allow('', null),
            clockOut: Joi.string().allow('', null),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);

        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        const { employeeId, clockIn, clockOut } = req.body;

        if (clockOut && !clockIn) {
            generateErrorUtil(
                'Debes indicar la hora de entrada si defines la salida',
                400
            );
        }

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        await insertShiftRecordService(serviceId, employeeId, clockIn, clockOut);

        res.send({
            status: 'ok',
            message: 'Turno creado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default newShiftRecordController;
