import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import editShiftRecordsService from '../../services/shiftRecords/editShiftRecordsService.js';
import selectShiftRecordByIdService from '../../services/shiftRecords/selectShiftRecordByIdService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const editShiftRecordController = async (req, res, next) => {
    try {
        const schema = Joi.object().keys({
            clockIn: Joi.date().required(),
            clockOut: Joi.date().required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);

        const { clockIn, clockOut } = req.body;

        const { shiftRecordId } = req.params;

        const shiftRecord = await selectShiftRecordByIdService(shiftRecordId);

        if (shiftRecord?.serviceId) {
            await ensureServiceDelegationAccessService(
                shiftRecord.serviceId,
                req.userLogged.id,
                req.userLogged.role
            );
        }

        await editShiftRecordsService(clockIn, clockOut, shiftRecordId);

        res.send({
            status: 'ok',
            message: 'Turno editado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default editShiftRecordController;
