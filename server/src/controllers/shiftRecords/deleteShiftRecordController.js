import deleteShiftRecordService from '../../services/shiftRecords/deleteShiftRecordService.js';
import selectShiftRecordByIdService from '../../services/shiftRecords/selectShiftRecordByIdService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const deleteShiftRecordController = async (req, res, next) => {
    try {
        const { shiftRecordId } = req.params;

        const shiftRecord = await selectShiftRecordByIdService(shiftRecordId);

        if (shiftRecord?.serviceId) {
            await ensureServiceDelegationAccessService(
                shiftRecord.serviceId,
                req.userLogged.id,
                req.userLogged.role
            );
        }

        await deleteShiftRecordService(shiftRecordId);

        res.send({
            status: 'ok',
            message: 'Turno eliminado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteShiftRecordController;
